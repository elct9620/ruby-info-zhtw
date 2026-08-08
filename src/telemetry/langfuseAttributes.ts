import type { Span } from '@opentelemetry/api';

/**
 * Everything that knows how Langfuse reads an OpenTelemetry span lives here.
 *
 * OpenTelemetry has no convention for what a step received and produced, so
 * there is no vendor-neutral way to record it: Langfuse resolves observation
 * input from `langfuse.observation.input`, then `gen_ai.prompt`, then
 * OpenInference's `input.value`, then MLflow's — all of them vendor
 * conventions. Naming Langfuse's directly is the honest choice, and keeping it
 * to one module is what stops the vocabulary from spreading.
 *
 * Trace-level input and output exist but are deprecated in favour of the root
 * observation's, so they are absent here on purpose.
 */
export const TRACE_NAME = 'langfuse.trace.name';
export const TRACE_TAGS = 'langfuse.trace.tags';
export const OBSERVATION_INPUT = 'langfuse.observation.input';
export const OBSERVATION_OUTPUT = 'langfuse.observation.output';

/**
 * Langfuse reads these attributes as JSON, and leaves a string untouched.
 */
export function setSerialized(span: Span, attribute: string, value: unknown): void {
	if (value === undefined || value === null) return;
	span.setAttribute(attribute, typeof value === 'string' ? value : JSON.stringify(value));
}
