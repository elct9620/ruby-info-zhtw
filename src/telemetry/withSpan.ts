import { SpanStatusCode, type Span, type Tracer } from '@opentelemetry/api';

/**
 * Runs `fn` inside a span that ends however `fn` finishes, marking the span
 * when it throws. A span left unended never reaches Langfuse, and one that ends
 * green after a failure is worse than no span at all.
 */
export async function withSpan<T>(tracer: Tracer, name: string, fn: (span: Span) => Promise<T>): Promise<T> {
	return tracer.startActiveSpan(name, async (span) => {
		try {
			return await fn(span);
		} catch (error) {
			span.recordException(error instanceof Error ? error : new Error(String(error)));
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw error;
		} finally {
			span.end();
		}
	});
}
