import { withSpan } from '@/telemetry/withSpan';
import { SpanStatusCode } from '@opentelemetry/api';
import { describe, expect, it } from 'vitest';
import { recordingTracer } from '../support/recordingTracer';

describe('withSpan', () => {
	it('should return what the work returns and end the span', async () => {
		const { tracer, spans } = recordingTracer();

		const result = await withSpan(tracer, { name: 'work' }, async () => 'done');

		expect(result).toBe('done');
		expect(spans()).toHaveLength(1);
		expect(spans()[0].name).toBe('work');
	});

	it('should record what the step received and produced', async () => {
		const { tracer, spans } = recordingTracer();

		await withSpan(
			tracer,
			{ name: 'work', input: { issueId: 42 }, output: (result) => ({ length: result.length }) },
			async () => 'summary',
		);

		expect(spans()[0].attributes).toEqual({
			'langfuse.observation.input': JSON.stringify({ issueId: 42 }),
			'langfuse.observation.output': JSON.stringify({ length: 7 }),
		});
	});

	it('should leave a string payload unwrapped rather than quoting it as JSON', async () => {
		const { tracer, spans } = recordingTracer();

		await withSpan(tracer, { name: 'work', input: 'plain text' }, async () => undefined);

		expect(spans()[0].attributes['langfuse.observation.input']).toBe('plain text');
	});

	it('should record no output when the step throws', async () => {
		const { tracer, spans } = recordingTracer();

		await expect(
			withSpan(tracer, { name: 'work', input: { issueId: 42 }, output: () => ({ never: true }) }, async () => {
				throw new Error('boom');
			}),
		).rejects.toThrow('boom');

		expect(spans()[0].attributes['langfuse.observation.output']).toBeUndefined();
	});

	it('should record the exception and mark the span when the work throws', async () => {
		const { tracer, spans } = recordingTracer();

		await expect(
			withSpan(tracer, { name: 'work' }, async () => {
				throw new Error('boom');
			}),
		).rejects.toThrow('boom');

		expect(spans()[0].status.code).toBe(SpanStatusCode.ERROR);
		expect(spans()[0].events[0].attributes?.['exception.message']).toBe('boom');
	});

	it('should record a thrown non-error as an exception rather than dropping it', async () => {
		const { tracer, spans } = recordingTracer();

		await expect(
			withSpan(tracer, { name: 'work' }, async () => {
				throw 'plain string failure';
			}),
		).rejects.toBe('plain string failure');

		expect(spans()[0].status.code).toBe(SpanStatusCode.ERROR);
		expect(spans()[0].events[0].attributes?.['exception.message']).toBe('plain string failure');
	});
});
