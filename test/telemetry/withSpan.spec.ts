import { withSpan } from '@/telemetry/withSpan';
import { SpanStatusCode } from '@opentelemetry/api';
import { describe, expect, it } from 'vitest';
import { recordingTracer } from '../support/recordingTracer';

describe('withSpan', () => {
	it('should return what the work returns and end the span', async () => {
		const { tracer, spans } = recordingTracer();

		const result = await withSpan(tracer, 'work', async () => 'done');

		expect(result).toBe('done');
		expect(spans()).toHaveLength(1);
		expect(spans()[0].name).toBe('work');
	});

	it('should record the exception and mark the span when the work throws', async () => {
		const { tracer, spans } = recordingTracer();

		await expect(
			withSpan(tracer, 'work', async () => {
				throw new Error('boom');
			}),
		).rejects.toThrow('boom');

		expect(spans()[0].status.code).toBe(SpanStatusCode.ERROR);
		expect(spans()[0].events[0].attributes?.['exception.message']).toBe('boom');
	});

	it('should record a thrown non-error as an exception rather than dropping it', async () => {
		const { tracer, spans } = recordingTracer();

		await expect(
			withSpan(tracer, 'work', async () => {
				throw 'plain string failure';
			}),
		).rejects.toBe('plain string failure');

		expect(spans()[0].status.code).toBe(SpanStatusCode.ERROR);
		expect(spans()[0].events[0].attributes?.['exception.message']).toBe('plain string failure');
	});
});
