import { Telemetry } from '@/telemetry/Telemetry';
import { trace } from '@opentelemetry/api';
import { describe, expect, it, vi } from 'vitest';

// A pipeline that cannot be constructed is the one failure mode that could stop
// the summary reaching Discord, so it gets its own file: the whole point is that
// building the exporter throws.
vi.mock('@langfuse/otel', () => ({
	LangfuseSpanProcessor: vi.fn(() => {
		throw new Error('LANGFUSE_BASE_URL is not a valid URL');
	}),
}));

describe('Telemetry.create when the pipeline cannot be built', () => {
	const CREDENTIALS = { publicKey: 'pk-test', secretKey: 'sk-test', baseUrl: 'not-a-url' };

	it('should return a telemetry instance rather than throwing', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		expect(() => Telemetry.create(CREDENTIALS)).not.toThrow();
	});

	it('should still run the traced work so the summary is delivered', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const telemetry = Telemetry.create(CREDENTIALS);

		const result = await telemetry.trace({ name: 'email-summarize' }, async () => 'summary delivered');

		expect(result).toBe('summary delivered');
	});

	it('should record nothing so no half-built pipeline is used', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const telemetry = Telemetry.create(CREDENTIALS);
		let recording: boolean | undefined;

		await telemetry.trace({ name: 'email-summarize' }, async () => {
			recording = trace.getActiveSpan()?.isRecording();
		});

		expect(recording).toBe(false);
	});

	it('should say why tracing is absent', () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		Telemetry.create(CREDENTIALS);

		expect(errorSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				level: 'error',
				component: 'Telemetry',
				message: expect.stringContaining('Telemetry setup failed'),
			}),
		);
	});
});
