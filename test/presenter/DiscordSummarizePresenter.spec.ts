import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DiscordSummarizePresenter } from '@/presenter/DiscordSummarizePresenter';
import { IssueType } from '@/entity/Issue';
import { UserAgent } from '@/constant';

describe('DiscordSummarizePresenter', () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		global.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	describe('setters', () => {
		it('setTitle stores the title value', () => {
			const presenter = new DiscordSummarizePresenter();
			presenter.setTitle('Test Title');

			global.fetch = vi.fn().mockResolvedValue({ ok: true });
			presenter.render('https://discord.webhook');

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					body: expect.stringContaining('Test Title'),
				})
			);
		});

		it('setDescription stores the description value', () => {
			const presenter = new DiscordSummarizePresenter();
			presenter.setDescription('Test Description');

			global.fetch = vi.fn().mockResolvedValue({ ok: true });
			presenter.render('https://discord.webhook');

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					body: expect.stringContaining('Test Description'),
				})
			);
		});

		it('setLink stores the link value', () => {
			const presenter = new DiscordSummarizePresenter();
			presenter.setLink('https://example.com/issue/123');

			global.fetch = vi.fn().mockResolvedValue({ ok: true });
			presenter.render('https://discord.webhook');

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					body: expect.stringContaining('https://example.com/issue/123'),
				})
			);
		});

		it('setType stores the type value', () => {
			const presenter = new DiscordSummarizePresenter();
			presenter.setType(IssueType.Feature);

			global.fetch = vi.fn().mockResolvedValue({ ok: true });
			presenter.render('https://discord.webhook');

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					body: expect.stringContaining('Feature'),
				})
			);
		});
	});

	describe('render', () => {
		it('returns true when webhook responds with 200', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter();
			presenter.setTitle('Test');
			presenter.setDescription('Test Description');

			const result = await presenter.render('https://discord.webhook');

			expect(result).toBe(true);
		});

		it('returns false when webhook responds with non-200', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				text: () => Promise.resolve('Error message'),
			});

			const presenter = new DiscordSummarizePresenter();
			presenter.setTitle('Test');
			presenter.setDescription('Test Description');

			const result = await presenter.render('https://discord.webhook');

			expect(result).toBe(false);
		});

		it('sends POST request with correct headers', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter();
			await presenter.render('https://discord.webhook');

			expect(global.fetch).toHaveBeenCalledWith(
				'https://discord.webhook',
				expect.objectContaining({
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'User-Agent': UserAgent,
					},
				})
			);
		});

		it('sends embed payload with all fields', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter();
			presenter.setTitle('Issue Title');
			presenter.setDescription('Issue Summary');
			presenter.setLink('https://bugs.ruby-lang.org/issues/123');
			presenter.setType(IssueType.Bug);

			await presenter.render('https://discord.webhook');

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

			const presenter = new DiscordSummarizePresenter();
			const longDescription = 'a'.repeat(3500);
			presenter.setDescription(longDescription);

			await presenter.render('https://discord.webhook');

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].description.length).toBeLessThanOrEqual(3030);
			expect(body.embeds[0].description).toContain('...(內容過長，已截斷)');
		});

		it('does not truncate description of exactly 3000 characters', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter();
			const exactDescription = 'a'.repeat(3000);
			presenter.setDescription(exactDescription);

			await presenter.render('https://discord.webhook');

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].description).toBe(exactDescription);
			expect(body.embeds[0].description).not.toContain('截斷');
		});

		it('does not truncate description shorter than 3000 characters', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter();
			const shortDescription = 'Short description';
			presenter.setDescription(shortDescription);

			await presenter.render('https://discord.webhook');

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].description).toBe(shortDescription);
		});
	});

	describe('type color and emoji mapping', () => {
		it('uses green color and sparkle emoji for Feature type', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter();
			presenter.setTitle('Feature');
			presenter.setType(IssueType.Feature);

			await presenter.render('https://discord.webhook');

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].color).toBe(0x2ecc71);
			expect(body.embeds[0].title).toContain('✨');
		});

		it('uses red color and bug emoji for Bug type', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter();
			presenter.setTitle('Bug');
			presenter.setType(IssueType.Bug);

			await presenter.render('https://discord.webhook');

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].color).toBe(0xe74c3c);
			expect(body.embeds[0].title).toContain('🐛');
		});

		it('uses blue color and wrench emoji for Misc type', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter();
			presenter.setTitle('Misc');
			presenter.setType(IssueType.Misc);

			await presenter.render('https://discord.webhook');

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].color).toBe(0x3498db);
			expect(body.embeds[0].title).toContain('🔧');
		});

		it('uses ruby red color and gem emoji for Unknown type', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter();
			presenter.setTitle('Unknown');
			presenter.setType(IssueType.Unknown);

			await presenter.render('https://discord.webhook');

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].color).toBe(0xcc342d);
			expect(body.embeds[0].title).toContain('💎');
		});

		it('uses default color and emoji when type is not set', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter();
			presenter.setTitle('Default');

			await presenter.render('https://discord.webhook');

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].color).toBe(0xcc342d);
			expect(body.embeds[0].title).toContain('💎');
		});
	});

	describe('embed structure', () => {
		it('includes timestamp in embed', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter();
			await presenter.render('https://discord.webhook');

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].timestamp).toBeDefined();
			expect(() => new Date(body.embeds[0].timestamp)).not.toThrow();
		});

		it('includes footer with AI disclaimer', async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true });

			const presenter = new DiscordSummarizePresenter();
			presenter.setType(IssueType.Bug);
			await presenter.render('https://discord.webhook');

			const callArgs = vi.mocked(global.fetch).mock.calls[0];
			const body = JSON.parse(callArgs[1]?.body as string);

			expect(body.embeds[0].footer.text).toContain('由 AI 自動歸納，僅供參考');
		});
	});
});
