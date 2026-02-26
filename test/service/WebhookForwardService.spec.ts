import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { WebhookForwardService } from '@/service/WebhookForwardService';
import { LangfuseService } from '@/service/LangfuseService';

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
		it('skips silently when urls array is empty', async () => {
			global.fetch = vi.fn();
			const service = new WebhookForwardService([]);

			await service.execute(123);

			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('sends POST with correct payload and content type', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });
			const service = new WebhookForwardService(['https://example.com/webhook']);

			await service.execute(456);

			expect(global.fetch).toHaveBeenCalledWith('https://example.com/webhook', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ issue_id: 456 }),
			});
		});

		it('sends to all URLs', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });
			const urls = ['https://a.com/hook', 'https://b.com/hook'];
			const service = new WebhookForwardService(urls);

			await service.execute(789);

			expect(global.fetch).toHaveBeenCalledTimes(2);
			expect(global.fetch).toHaveBeenCalledWith('https://a.com/hook', expect.any(Object));
			expect(global.fetch).toHaveBeenCalledWith('https://b.com/hook', expect.any(Object));
		});

		it('logs success for each URL', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });
			const service = new WebhookForwardService(['https://example.com/webhook']);

			await service.execute(123);

			expect(logSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					level: 'info',
					component: 'WebhookForwardService',
					message: expect.stringContaining('Webhook forwarded successfully'),
					issueId: 123,
				})
			);
		});

		it('logs error when fetch fails but does not throw', async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
			const service = new WebhookForwardService(['https://example.com/webhook']);

			await expect(service.execute(123)).resolves.toBeUndefined();

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					level: 'error',
					component: 'WebhookForwardService',
					message: expect.stringContaining('Webhook forward failed'),
					issueId: 123,
				})
			);
		});

		it('logs error when response is not ok but does not throw', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
			const service = new WebhookForwardService(['https://example.com/webhook']);

			await expect(service.execute(123)).resolves.toBeUndefined();

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					level: 'error',
					component: 'WebhookForwardService',
					message: expect.stringContaining('Webhook forward failed'),
					issueId: 123,
				})
			);
		});

		it('continues forwarding to other URLs when one fails', async () => {
			global.fetch = vi.fn()
				.mockRejectedValueOnce(new Error('Connection refused'))
				.mockResolvedValueOnce({ ok: true });
			const service = new WebhookForwardService(['https://fail.com/hook', 'https://ok.com/hook']);

			await service.execute(123);

			expect(global.fetch).toHaveBeenCalledTimes(2);
			expect(logSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					level: 'info',
					message: expect.stringContaining('Webhook forwarded successfully'),
				})
			);
			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					level: 'error',
					message: expect.stringContaining('Webhook forward failed'),
				})
			);
		});

		it('creates Langfuse span when langfuseService is provided', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });
			const langfuseService = {
				createSpan: vi.fn().mockResolvedValue(undefined),
			} as unknown as LangfuseService;

			const service = new WebhookForwardService(
				['https://example.com/webhook'],
				langfuseService,
				'trace-123'
			);

			await service.execute(456);

			expect(langfuseService.createSpan).toHaveBeenCalledWith(
				expect.objectContaining({
					traceId: 'trace-123',
					name: 'webhook-forward',
					input: { host: 'example.com' },
					output: { success: true },
				})
			);
		});

		it('does not create span when langfuseService is not provided', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });
			const service = new WebhookForwardService(['https://example.com/webhook']);

			await service.execute(456);

			expect(logSpy).toHaveBeenCalledWith(
				expect.objectContaining({ level: 'info' })
			);
		});

		it('degrades gracefully when span creation fails', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });
			const langfuseService = {
				createSpan: vi.fn().mockRejectedValue(new Error('Langfuse down')),
			} as unknown as LangfuseService;

			const service = new WebhookForwardService(
				['https://example.com/webhook'],
				langfuseService,
				'trace-123'
			);

			await expect(service.execute(456)).resolves.toBeUndefined();

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					level: 'error',
					message: expect.stringContaining('Failed to create webhook-forward span'),
				})
			);
		});
	});
});
