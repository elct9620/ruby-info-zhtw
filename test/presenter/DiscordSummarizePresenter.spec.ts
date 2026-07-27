import { UserAgent } from '@/constant';
import { IssueType } from '@/entity/Issue';
import { DiscordSummarizePresenter } from '@/presenter/DiscordSummarizePresenter';
import { SummarizeResult } from '@/usecase/interface';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeResult(overrides: Partial<SummarizeResult> = {}): SummarizeResult {
	return {
		title: '',
		description: '',
		link: '',
		type: IssueType.Unknown,
		...overrides,
	};
}

describe('DiscordSummarizePresenter', () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		global.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	describe('render', () => {
		it('does not throw when webhook responds with 200', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter('https://discord.webhook');

			await expect(
				presenter.render(
					makeResult({
						title: 'Test',
						description: 'Test Description',
					}),
				),
			).resolves.toBeUndefined();
		});

		it('does not throw when webhook responds with non-200', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				text: () => Promise.resolve('Error message'),
			});

			const presenter = new DiscordSummarizePresenter('https://discord.webhook');

			await expect(
				presenter.render(
					makeResult({
						title: 'Test',
						description: 'Test Description',
					}),
				),
			).resolves.toBeUndefined();
		});

		it('cancels response body on successful webhook response', async () => {
			const cancelFn = vi.fn();
			global.fetch = vi.fn().mockResolvedValue({ ok: true, body: { cancel: cancelFn } });

			const presenter = new DiscordSummarizePresenter('https://discord.webhook');
			await presenter.render(makeResult({ title: 'Test', description: 'Test Description' }));

			expect(cancelFn).toHaveBeenCalledOnce();
		});

		it('sends POST request with correct headers', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter('https://discord.webhook');
			await presenter.render(makeResult());

			expect(global.fetch).toHaveBeenCalledWith(
				'https://discord.webhook',
				expect.objectContaining({
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'User-Agent': UserAgent,
					},
				}),
			);
		});

		it('sends embed payload with all fields', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter('https://discord.webhook');
			await presenter.render(
				makeResult({
					title: 'Issue Title',
					description: 'Issue Summary',
					link: 'https://bugs.ruby-lang.org/issues/123',
					type: IssueType.Bug,
				}),
			);

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds).toHaveLength(1);
			expect(body.embeds[0].title).toContain('Issue Title');
			expect(body.embeds[0].description).toBe('Issue Summary');
			expect(body.embeds[0].url).toBe('https://bugs.ruby-lang.org/issues/123');
			expect(body.embeds[0].footer.text).toContain('Bug');
		});
	});

	describe('content truncation', () => {
		it('truncates description longer than 3000 characters', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter('https://discord.webhook');
			await presenter.render(makeResult({ description: 'a'.repeat(3500) }));

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].description.length).toBeLessThanOrEqual(3030);
			expect(body.embeds[0].description).toContain('...(內容過長，已截斷)');
		});

		it('does not truncate description of exactly 3000 characters', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const exactDescription = 'a'.repeat(3000);
			const presenter = new DiscordSummarizePresenter('https://discord.webhook');
			await presenter.render(makeResult({ description: exactDescription }));

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].description).toBe(exactDescription);
			expect(body.embeds[0].description).not.toContain('截斷');
		});

		it('does not truncate description shorter than 3000 characters', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter('https://discord.webhook');
			await presenter.render(makeResult({ description: 'Short description' }));

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].description).toBe('Short description');
		});
	});

	describe('type color and emoji mapping', () => {
		it('uses green color and sparkle emoji for Feature type', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter('https://discord.webhook');
			await presenter.render(makeResult({ title: 'Feature', type: IssueType.Feature }));

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].color).toBe(0x2ecc71);
			expect(body.embeds[0].title).toContain('✨');
		});

		it('uses red color and bug emoji for Bug type', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter('https://discord.webhook');
			await presenter.render(makeResult({ title: 'Bug', type: IssueType.Bug }));

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].color).toBe(0xe74c3c);
			expect(body.embeds[0].title).toContain('🐛');
		});

		it('uses blue color and wrench emoji for Misc type', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter('https://discord.webhook');
			await presenter.render(makeResult({ title: 'Misc', type: IssueType.Misc }));

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].color).toBe(0x3498db);
			expect(body.embeds[0].title).toContain('🔧');
		});

		it('uses ruby red color and gem emoji for Unknown type', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter('https://discord.webhook');
			await presenter.render(makeResult({ title: 'Unknown', type: IssueType.Unknown }));

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].color).toBe(0xcc342d);
			expect(body.embeds[0].title).toContain('💎');
		});

		it('uses default color and emoji when type is Unknown', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter('https://discord.webhook');
			await presenter.render(makeResult({ title: 'Default' }));

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].color).toBe(0xcc342d);
			expect(body.embeds[0].title).toContain('💎');
		});
	});

	describe('embed structure', () => {
		it('includes timestamp in embed', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter('https://discord.webhook');
			await presenter.render(makeResult());

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].timestamp).toBeDefined();
			expect(() => new Date(body.embeds[0].timestamp)).not.toThrow();
		});

		it('includes footer with AI disclaimer', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter('https://discord.webhook');
			await presenter.render(makeResult({ type: IssueType.Bug }));

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].footer.text).toContain('由 AI 自動歸納，僅供參考');
		});
	});
});
