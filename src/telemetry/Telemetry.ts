import { LangfuseSpanProcessor } from '@langfuse/otel';
import { LangfuseVercelAiSdkIntegration } from '@langfuse/vercel-ai-sdk';
import { context, type Tracer } from '@opentelemetry/api';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { WorkerContextManager } from './WorkerContextManager';

export interface TelemetryParams {
	publicKey?: string;
	secretKey?: string;
	baseUrl?: string;
}

/**
 * Instrumentation scope tells a reader which library emitted a span. The AI SDK
 * records its own generations under `ai`, so its integration gets a tracer by
 * that name; everything this project emits itself gets a tracer named after the
 * project rather than borrowing the SDK's identity.
 */
const AI_SDK_SCOPE = 'ai';
const PROJECT_SCOPE = 'ruby-info-zhtw';

/**
 * OTel resolves span parents through the active context, which needs a context
 * manager to exist at all. Without one `startActiveSpan` cannot nest, so the AI
 * SDK's generation spans would surface as separate traces instead of children
 * of the root span. Registration is isolate-wide and survives across
 * invocations, hence the module-scope guard. The manager holds no per-trace
 * state — AsyncLocalStorage keys off the async flow — so sharing one across
 * concurrent Durable Object instances is safe.
 */
let contextManagerRegistered = false;

function ensureContextManager(): void {
	if (contextManagerRegistered) return;

	context.setGlobalContextManager(new WorkerContextManager());
	contextManagerRegistered = true;
}

/**
 * Tracing pipeline for a single invocation: an OTel tracer for the flow's own
 * spans, an AI SDK integration for generation spans, and the flush that a
 * Worker owes before it terminates.
 *
 * The provider is per-invocation and never registered globally, so concurrent
 * Durable Object instances sharing an isolate cannot route each other's spans.
 */
export class Telemetry {
	/**
	 * Builds the pipeline, or returns undefined when Langfuse credentials are
	 * absent so the caller runs uninstrumented.
	 */
	static create({ publicKey, secretKey, baseUrl }: TelemetryParams): Telemetry | undefined {
		if (!publicKey || !secretKey) return undefined;

		ensureContextManager();

		const provider = new BasicTracerProvider({
			spanProcessors: [
				new LangfuseSpanProcessor({
					publicKey,
					secretKey,
					baseUrl,
					// `immediate` issues one HTTP request per span, which would multiply
					// into subrequests the Worker cannot spare. Batching is safe because
					// every invocation flushes before it ends.
					exportMode: 'batched',
					// Media upload issues extra API calls for base64 payloads; this
					// pipeline only ever produces text.
					mediaUploadEnabled: false,
					// The default filter only passes spans Langfuse recognises — its own,
					// and those carrying `gen_ai.` attributes. This provider exists solely
					// to feed Langfuse, and the flow's plain OTel spans would otherwise be
					// dropped without a trace.
					shouldExportSpan: () => true,
				}),
			],
		});

		return new Telemetry(provider);
	}

	readonly tracer: Tracer;
	readonly integration: LangfuseVercelAiSdkIntegration;

	private constructor(private readonly provider: BasicTracerProvider) {
		this.tracer = provider.getTracer(PROJECT_SCOPE);
		this.integration = new LangfuseVercelAiSdkIntegration({ tracer: provider.getTracer(AI_SDK_SCOPE) });
	}

	/**
	 * Exports everything recorded so far. OTel discards exporter failures through
	 * a no-op `diag` logger by default, so a caller that wants to know must
	 * handle the rejection.
	 */
	async flush(): Promise<void> {
		await this.provider.forceFlush();
	}
}
