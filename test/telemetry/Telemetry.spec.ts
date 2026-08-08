import { Telemetry } from '@/telemetry/Telemetry';
import { withSpan } from '@/telemetry/withSpan';
import { trace } from '@opentelemetry/api';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CREDENTIALS = { publicKey: 'pk-test', secretKey: 'sk-test', baseUrl: 'https://langfuse.test' };

async function recordingInsideTrace(telemetry: Telemetry): Promise<boolean | undefined> {
	let recording: boolean | undefined;
	await telemetry.trace({ name: 'test-trace' }, async () => {
		recording = trace.getActiveSpan()?.isRecording();
	});
	return recording;
}

describe('Telemetry', () => {
	describe('when Langfuse credentials are absent', () => {
		it('should record nothing when the public key is missing', async () => {
			const telemetry = Telemetry.create({ secretKey: 'sk-test' });

			expect(await recordingInsideTrace(telemetry)).toBe(false);
		});

		it('should record nothing when the secret key is missing', async () => {
			const telemetry = Telemetry.create({ publicKey: 'pk-test' });

			expect(await recordingInsideTrace(telemetry)).toBe(false);
		});

		it('should record nothing when both keys are empty strings', async () => {
			const telemetry = Telemetry.create({ publicKey: '', secretKey: '' });

			expect(await recordingInsideTrace(telemetry)).toBe(false);
		});

		it('should still run the traced work', async () => {
			const telemetry = Telemetry.create({});

			const result = await telemetry.trace({ name: 'test-trace' }, async () => 'done');

			expect(result).toBe('done');
		});
	});

	describe('when Langfuse credentials are present', () => {
		// The exporter posts to Langfuse the moment a trace ends. Left alone it would
		// reach for the network and reject after the test has already finished.
		beforeEach(() => {
			vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('should record the trace', async () => {
			const telemetry = Telemetry.create(CREDENTIALS);

			expect(await recordingInsideTrace(telemetry)).toBe(true);
		});

		it('should describe the trace to Langfuse with its name, tags, input and output', async () => {
			const telemetry = Telemetry.create(CREDENTIALS);
			let root: ReadableSpan | undefined;

			await telemetry.trace(
				{
					name: 'email-summarize',
					tags: ['summarize'],
					input: { issueId: 12345 },
					output: (result: string) => ({ success: result === 'delivered' }),
				},
				async () => {
					root = trace.getActiveSpan() as unknown as ReadableSpan;
					return 'delivered';
				},
			);

			expect(root?.attributes).toMatchObject({
				'langfuse.trace.name': 'email-summarize',
				'langfuse.trace.tags': ['summarize'],
				'langfuse.observation.input': JSON.stringify({ issueId: 12345 }),
				'langfuse.observation.output': JSON.stringify({ success: true }),
			});
		});

		it('should return what the traced work returns', async () => {
			const telemetry = Telemetry.create(CREDENTIALS);

			const result = await telemetry.trace({ name: 'test-trace' }, async () => ({ issueId: 42 }));

			expect(result).toEqual({ issueId: 42 });
		});

		it('should propagate the error the traced work throws', async () => {
			const telemetry = Telemetry.create(CREDENTIALS);

			await expect(
				telemetry.trace({ name: 'test-trace' }, async () => {
					throw new Error('summarize failed');
				}),
			).rejects.toThrow('summarize failed');
		});

		it('should not let a failing export replace the traced work result', async () => {
			vi.spyOn(console, 'warn').mockImplementation(() => {});
			vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Langfuse unreachable')));
			const telemetry = Telemetry.create(CREDENTIALS);

			await expect(telemetry.trace({ name: 'test-trace' }, async () => 'delivered')).resolves.toBe('delivered');
		});
	});

	it('should expose a tracer and an AI SDK integration for the flow to use', () => {
		const telemetry = Telemetry.create(CREDENTIALS);

		expect(telemetry.tracer).toBeDefined();
		expect(telemetry.integration).toBeDefined();
	});

	// The point of the whole pipeline: the Bug Tracker fetch, the AI generation and
	// the two webhook deliveries each open their own span without knowing about the
	// others, and still land in one trace the reader can follow end to end.
	it('should gather spans opened during the trace under the root', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
		const telemetry = Telemetry.create(CREDENTIALS);
		let root: { traceId: string; spanId: string } | undefined;
		let child: { traceId: string; parentSpanId?: string } | undefined;

		await telemetry.trace({ name: 'email-summarize' }, async () => {
			root = trace.getActiveSpan()?.spanContext();
			await withSpan(telemetry.tracer, { name: 'fetch-issue' }, async () => {
				const span = trace.getActiveSpan() as unknown as ReadableSpan;
				child = { traceId: span.spanContext().traceId, parentSpanId: span.parentSpanContext?.spanId };
			});
		});

		expect(root?.traceId).toBeTruthy();
		expect(child?.traceId).toBe(root?.traceId);
		expect(child?.parentSpanId).toBe(root?.spanId);
		vi.unstubAllGlobals();
	});
});
