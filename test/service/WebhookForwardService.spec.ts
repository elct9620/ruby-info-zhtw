import { WebhookForwardService } from '@/service/WebhookForwardService';
import { SpanStatusCode } from '@opentelemetry/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordingTracer } from '../support/recordingTracer';

describe('WebhookForwardService', () => {
	const originalFetch = global.fetch;
	let logSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		global.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	describe('execute', () => {
		it('should skip silently when no URLs are configured', async () => {
			global.fetch = vi.fn();
			const { tracer } = recordingTracer();

			await new WebhookForwardService([], tracer).execute(123);

			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('should send the issue id as JSON', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });
			const { tracer } = recordingTracer();

			await new WebhookForwardService(['https://example.com/webhook'], tracer).execute(456);

			expect(global.fetch).toHaveBeenCalledWith('https://example.com/webhook', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ issue_id: 456 }),
			});
		});

		it('should send to every configured URL', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });
			const { tracer } = recordingTracer();

			await new WebhookForwardService(['https://a.com/hook', 'https://b.com/hook'], tracer).execute(789);

			expect(global.fetch).toHaveBeenCalledTimes(2);
			expect(global.fetch).toHaveBeenCalledWith('https://a.com/hook', expect.any(Object));
			expect(global.fetch).toHaveBeenCalledWith('https://b.com/hook', expect.any(Object));
		});

		it('should log success for each URL', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });
			const { tracer } = recordingTracer();

			await new WebhookForwardService(['https://example.com/webhook'], tracer).execute(123);

			expect(logSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					level: 'info',
					component: 'WebhookForwardService',
					message: expect.stringContaining('Webhook forwarded successfully'),
					issueId: 123,
				}),
			);
		});

		it('should log the error without throwing when the request fails', async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
			const { tracer } = recordingTracer();

			await expect(new WebhookForwardService(['https://example.com/webhook'], tracer).execute(123)).resolves.toBeUndefined();

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					level: 'error',
					component: 'WebhookForwardService',
					message: expect.stringContaining('Webhook forward failed'),
					issueId: 123,
				}),
			);
		});

		it('should log the error without throwing when the response is not ok', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
			const { tracer } = recordingTracer();

			await expect(new WebhookForwardService(['https://example.com/webhook'], tracer).execute(123)).resolves.toBeUndefined();

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					level: 'error',
					component: 'WebhookForwardService',
					message: expect.stringContaining('Webhook forward failed'),
					issueId: 123,
				}),
			);
		});

		it('should keep forwarding to the other URLs when one fails', async () => {
			global.fetch = vi.fn().mockRejectedValueOnce(new Error('Connection refused')).mockResolvedValueOnce({ ok: true });
			const { tracer } = recordingTracer();

			await new WebhookForwardService(['https://fail.com/hook', 'https://ok.com/hook'], tracer).execute(123);

			expect(global.fetch).toHaveBeenCalledTimes(2);
			expect(logSpy).toHaveBeenCalledWith(
				expect.objectContaining({ level: 'info', message: expect.stringContaining('Webhook forwarded successfully') }),
			);
			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({ level: 'error', message: expect.stringContaining('Webhook forward failed') }),
			);
		});

		it('should cancel the response body after a successful forward', async () => {
			const cancelFn = vi.fn();
			global.fetch = vi.fn().mockResolvedValue({ ok: true, body: { cancel: cancelFn } });
			const { tracer } = recordingTracer();

			await new WebhookForwardService(['https://example.com/webhook'], tracer).execute(123);

			expect(cancelFn).toHaveBeenCalledOnce();
		});

		it('should cancel the response body after a failed forward', async () => {
			const cancelFn = vi.fn();
			global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, body: { cancel: cancelFn } });
			const { tracer } = recordingTracer();

			await new WebhookForwardService(['https://example.com/webhook'], tracer).execute(123);

			expect(cancelFn).toHaveBeenCalledOnce();
		});
	});

	describe('tracing', () => {
		it('should record a webhook-forward span carrying the target host and status', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
			const { tracer, spans } = recordingTracer();

			await new WebhookForwardService(['https://example.com/webhook'], tracer).execute(456);

			expect(spans()).toHaveLength(1);
			expect(spans()[0].name).toBe('webhook-forward');
			expect(spans()[0].attributes).toEqual({ 'server.address': 'example.com', 'http.response.status_code': 200 });
		});

		it('should mark the span as failed when the response is not ok', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
			const { tracer, spans } = recordingTracer();

			await new WebhookForwardService(['https://example.com/webhook'], tracer).execute(456);

			expect(spans()[0].status).toEqual({ code: SpanStatusCode.ERROR, message: 'HTTP 500' });
		});

		it('should mark the span as failed when the request throws', async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
			const { tracer, spans } = recordingTracer();

			await new WebhookForwardService(['https://example.com/webhook'], tracer).execute(456);

			expect(spans()[0].status.code).toBe(SpanStatusCode.ERROR);
		});

		it('should keep an unparseable URL out of the span as a marker rather than the raw value', async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error('Invalid URL'));
			const { tracer, spans } = recordingTracer();

			await new WebhookForwardService(['not-a-url'], tracer).execute(456);

			expect(spans()[0].attributes['server.address']).toBe('[invalid-url]');
		});
	});
});
