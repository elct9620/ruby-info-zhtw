import { LangfuseSpanProcessor } from '@langfuse/otel';
import { LangfuseVercelAiSdkIntegration } from '@langfuse/vercel-ai-sdk';
import { context, type Span, type Tracer } from '@opentelemetry/api';
import { AlwaysOffSampler, BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { WorkerContextManager } from './WorkerContextManager';
import { withSpan } from './withSpan';

export interface TelemetryParams {
	publicKey?: string;
	secretKey?: string;
	baseUrl?: string;
}

export interface TraceParams<T> {
	name: string;
	tags?: string[];
	input?: unknown;
	output?: (result: T) => unknown;
}

/**
 * Attributes Langfuse reads off the root span to name the trace, file it, and
 * show what went in and out. Every other span this project emits uses plain
 * OpenTelemetry attributes, so Langfuse's vocabulary stays confined to this one
 * place and the export configuration.
 */
const TRACE_NAME = 'langfuse.trace.name';
const TRACE_TAGS = 'langfuse.trace.tags';
const TRACE_INPUT = 'langfuse.trace.input';
const TRACE_OUTPUT = 'langfuse.trace.output';

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
 * Langfuse reads these attributes as JSON, and leaves a string untouched.
 */
function setSerialized(span: Span, attribute: string, value: unknown): void {
	if (value === undefined || value === null) return;
	span.setAttribute(attribute, typeof value === 'string' ? value : JSON.stringify(value));
}

/**
 * Tracing pipeline for a single invocation: an OpenTelemetry tracer for the
 * flow's own spans, an AI SDK integration for generation spans, and the root
 * observation every trace hangs from.
 *
 * The provider is per-invocation and never registered globally, so concurrent
 * Durable Object instances sharing an isolate cannot route each other's spans.
 *
 * Without Langfuse credentials the pipeline samples nothing, which is how
 * tracing stays silently absent instead of forcing every caller to ask whether
 * it is configured.
 */
export class Telemetry {
	static create({ publicKey, secretKey, baseUrl }: TelemetryParams): Telemetry {
		ensureContextManager();

		if (!publicKey || !secretKey) {
			return new Telemetry(new BasicTracerProvider({ sampler: new AlwaysOffSampler() }));
		}

		return new Telemetry(
			new BasicTracerProvider({
				spanProcessors: [
					new LangfuseSpanProcessor({
						publicKey,
						secretKey,
						baseUrl,
						// `immediate` issues one HTTP request per span, which would multiply
						// into subrequests the Worker cannot spare. Batching is safe because
						// every trace flushes before it ends.
						exportMode: 'batched',
						// Media upload issues extra API calls for base64 payloads; this
						// pipeline only ever produces text.
						mediaUploadEnabled: false,
						// The default filter only passes spans Langfuse recognises — its own,
						// and those carrying `gen_ai.` attributes. The flow's plain
						// OpenTelemetry spans would otherwise be dropped without a trace.
						shouldExportSpan: () => true,
					}),
				],
			}),
		);
	}

	readonly tracer: Tracer;
	readonly integration: LangfuseVercelAiSdkIntegration;

	private constructor(private readonly provider: BasicTracerProvider) {
		this.tracer = provider.getTracer(PROJECT_SCOPE);
		this.integration = new LangfuseVercelAiSdkIntegration({ tracer: provider.getTracer(AI_SDK_SCOPE) });
	}

	/**
	 * Runs `fn` as the root observation of a new trace, then exports everything
	 * recorded under it. A Worker invocation ends without warning, so a trace
	 * that is not flushed here never leaves.
	 */
	async trace<T>({ name, tags, input, output }: TraceParams<T>, fn: () => Promise<T>): Promise<T> {
		try {
			return await withSpan(this.tracer, name, async (span) => {
				span.setAttribute(TRACE_NAME, name);
				if (tags) span.setAttribute(TRACE_TAGS, tags);
				setSerialized(span, TRACE_INPUT, input);

				const result = await fn();
				setSerialized(span, TRACE_OUTPUT, output?.(result));
				return result;
			});
		} finally {
			await this.flush();
		}
	}

	/**
	 * A rejected flush must never replace the error the caller was already
	 * throwing, but it does have to be visible: OpenTelemetry discards exporter
	 * failures through a no-op `diag` logger by default.
	 */
	private async flush(): Promise<void> {
		try {
			await this.provider.forceFlush();
		} catch (error) {
			console.warn('telemetry flush failed:', error);
		}
	}
}
