import { SpanStatusCode, type Span, type Tracer } from '@opentelemetry/api';
import { OBSERVATION_INPUT, OBSERVATION_OUTPUT, setSerialized } from './langfuseAttributes';

export interface SpanParams<T> {
	name: string;
	input?: unknown;
	output?: (result: T) => unknown;
}

/**
 * Runs `fn` inside a span that records what the step received and produced, and
 * that ends however `fn` finishes. A span left unended never reaches Langfuse,
 * and one that ends green after a failure is worse than no span at all.
 *
 * `output` is read from the result rather than passed in, so a step that throws
 * records no output at all instead of an output that never happened.
 */
export async function withSpan<T>(tracer: Tracer, { name, input, output }: SpanParams<T>, fn: (span: Span) => Promise<T>): Promise<T> {
	return tracer.startActiveSpan(name, async (span) => {
		try {
			setSerialized(span, OBSERVATION_INPUT, input);
			const result = await fn(span);
			setSerialized(span, OBSERVATION_OUTPUT, output?.(result));
			return result;
		} catch (error) {
			span.recordException(error instanceof Error ? error : new Error(String(error)));
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw error;
		} finally {
			span.end();
		}
	});
}
