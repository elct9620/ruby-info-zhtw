import { WorkerContextManager } from '@/telemetry/WorkerContextManager';
import { context, type Tracer } from '@opentelemetry/api';
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor, type ReadableSpan } from '@opentelemetry/sdk-trace-base';

let contextManagerRegistered = false;

/**
 * A tracer whose spans stay in memory, so a test can assert what a decorator
 * records without an exporter or a network round trip.
 */
export function recordingTracer(): { tracer: Tracer; spans: () => ReadableSpan[] } {
	if (!contextManagerRegistered) {
		context.setGlobalContextManager(new WorkerContextManager());
		contextManagerRegistered = true;
	}

	const exporter = new InMemorySpanExporter();
	const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });

	return { tracer: provider.getTracer('test'), spans: () => exporter.getFinishedSpans() };
}
