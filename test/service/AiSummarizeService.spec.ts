import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AiSummarizeService } from '@/service/AiSummarizeService';
import { Issue, IssueType } from '@/entity/Issue';
import { Journal } from '@/entity/Journal';
import { LangfuseService } from '@/service/LangfuseService';
import { generateText, LanguageModel } from 'ai';

vi.mock('ai', () => ({
	generateText: vi.fn(),
}));

describe('AiSummarizeService', () => {
	let mockModel: LanguageModel;

	beforeEach(() => {
		mockModel = {} as LanguageModel;
		vi.mocked(generateText).mockReset();
	});

	describe('execute', () => {
		it('generates summary for issue without journals', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Generated summary text',
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(12345, {
				subject: 'Test Subject',
				description: 'Test Description',
				type: IssueType.Feature,
				authorName: 'Test Author',
				link: '',
			});

			const service = new AiSummarizeService(mockModel);
			const result = await service.execute(issue);

			expect(result).toBe('Generated summary text');
			expect(generateText).toHaveBeenCalledWith({
				model: mockModel,
				prompt: expect.stringContaining('Test Subject'),
			});
		});

		it('includes author name in prompt', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(1, {
				subject: 'Subject',
				description: 'Description',
				authorName: 'John Doe',
				link: '',
			});

			const service = new AiSummarizeService(mockModel);
			await service.execute(issue);

			const promptArg = vi.mocked(generateText).mock.calls[0][0].prompt;
			expect(promptArg).toContain('John Doe');
		});

		it('includes assignee name when present', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(1, {
				subject: 'Subject',
				description: 'Description',
				authorName: 'Author',
				assigneeName: 'Assignee Name',
				link: '',
			});

			const service = new AiSummarizeService(mockModel);
			await service.execute(issue);

			const promptArg = vi.mocked(generateText).mock.calls[0][0].prompt;
			expect(promptArg).toContain('Assignee Name');
		});

		it('includes issue type in prompt', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(1, {
				subject: 'Subject',
				description: 'Description',
				type: IssueType.Bug,
				authorName: 'Author',
				link: '',
			});

			const service = new AiSummarizeService(mockModel);
			await service.execute(issue);

			const promptArg = vi.mocked(generateText).mock.calls[0][0].prompt;
			expect(promptArg).toContain('Bug');
		});

		it('includes description in prompt', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(1, {
				subject: 'Subject',
				description: 'Detailed issue description with technical details',
				authorName: 'Author',
				link: '',
			});

			const service = new AiSummarizeService(mockModel);
			await service.execute(issue);

			const promptArg = vi.mocked(generateText).mock.calls[0][0].prompt;
			expect(promptArg).toContain('Detailed issue description with technical details');
		});

		it('includes latest journal when journals exist', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary with journal',
			} as Awaited<ReturnType<typeof generateText>>);

			const journal1 = new Journal(1, 'First Commenter', 'First comment');
			const journal2 = new Journal(2, 'Latest Commenter', 'Latest comment notes');
			const issue = new Issue(1, {
				subject: 'Subject',
				description: 'Description',
				authorName: 'Author',
				link: '',
				journals: [journal1, journal2],
			});

			const service = new AiSummarizeService(mockModel);
			await service.execute(issue);

			const promptArg = vi.mocked(generateText).mock.calls[0][0].prompt;
			expect(promptArg).toContain('Latest Commenter');
			expect(promptArg).toContain('Latest comment notes');
		});

		it('includes all journals in prompt', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
			} as Awaited<ReturnType<typeof generateText>>);

			const journal1 = new Journal(1, 'User One', 'Comment One');
			const journal2 = new Journal(2, 'User Two', 'Comment Two');
			const issue = new Issue(1, {
				subject: 'Subject',
				description: 'Description',
				authorName: 'Author',
				link: '',
				journals: [journal1, journal2],
			});

			const service = new AiSummarizeService(mockModel);
			await service.execute(issue);

			const promptArg = vi.mocked(generateText).mock.calls[0][0].prompt;
			expect(promptArg).toContain('User One');
			expect(promptArg).toContain('Comment One');
			expect(promptArg).toContain('User Two');
			expect(promptArg).toContain('Comment Two');
		});

		it('handles issue with empty journals array', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary without journals',
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(1, {
				subject: 'Subject',
				description: 'Description',
				authorName: 'Author',
				link: '',
			});

			const service = new AiSummarizeService(mockModel);
			const result = await service.execute(issue);

			expect(result).toBe('Summary without journals');
			expect(generateText).toHaveBeenCalled();
		});

		it('passes the model to generateText', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(1, {
				subject: 'Subject',
				description: 'Description',
				authorName: 'Author',
				link: '',
			});

			const service = new AiSummarizeService(mockModel);
			await service.execute(issue);

			expect(generateText).toHaveBeenCalledWith(
				expect.objectContaining({
					model: mockModel,
				})
			);
		});

		it('works without langfuse service', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(1, {
				subject: 'Subject',
				description: 'Description',
				authorName: 'Author',
				link: '',
			});

			const service = new AiSummarizeService(mockModel);
			const result = await service.execute(issue);

			expect(result).toBe('Summary');
		});
	});

	describe('langfuse integration', () => {
		let mockFetch: ReturnType<typeof vi.fn>;
		let langfuseService: LangfuseService;

		beforeEach(() => {
			mockFetch = vi.fn().mockResolvedValue({ ok: true });
			vi.stubGlobal('fetch', mockFetch);
			vi.stubGlobal('crypto', {
				randomUUID: () => 'test-uuid',
			});
			langfuseService = new LangfuseService('pub-key', 'sec-key');
		});

		it('sends trace-create and generation-create when no external traceId', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
				response: { modelId: 'gpt-5-mini', id: 'resp-123', timestamp: new Date() },
				usage: { inputTokens: 100, outputTokens: 50 },
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(12345, {
				subject: 'Subject',
				description: 'Description',
				authorName: 'Author',
				link: '',
			});

			const service = new AiSummarizeService(mockModel, langfuseService);
			await service.execute(issue);

			expect(mockFetch).toHaveBeenCalledOnce();
			const body = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(body.batch).toHaveLength(2);
			expect(body.batch[0].type).toBe('trace-create');
			expect(body.batch[0].body.name).toBe('summarize-issue');
			expect(body.batch[1].type).toBe('generation-create');
			expect(body.batch[1].body.model).toBe('gpt-5-mini');
			expect(body.batch[1].body.usage).toEqual({ input: 100, output: 50 });
		});

		it('sends only generation-create when external traceId is set', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
				response: { modelId: 'gpt-5-mini', id: 'resp-123', timestamp: new Date() },
				usage: { inputTokens: 100, outputTokens: 50 },
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(12345, {
				subject: 'Subject',
				description: 'Description',
				authorName: 'Author',
				link: '',
			});

			const service = new AiSummarizeService(mockModel, langfuseService);
			service.setTraceId('external-trace-id');
			await service.execute(issue);

			expect(mockFetch).toHaveBeenCalledOnce();
			const body = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(body.batch).toHaveLength(1);
			expect(body.batch[0].type).toBe('generation-create');
			expect(body.batch[0].body.traceId).toBe('external-trace-id');
			expect(body.batch[0].body.metadata).toEqual({ issueId: 12345 });
		});

		it('does not throw when langfuse ingestion fails', async () => {
			mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' });
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
				response: { modelId: 'gpt-5-mini', id: 'resp-123', timestamp: new Date() },
				usage: { inputTokens: 100, outputTokens: 50 },
			} as Awaited<ReturnType<typeof generateText>>);

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const issue = new Issue(1, {
				subject: 'Subject',
				description: 'Description',
				authorName: 'Author',
				link: '',
			});

			const service = new AiSummarizeService(mockModel, langfuseService);
			const result = await service.execute(issue);

			expect(result).toBe('Summary');
			consoleSpy.mockRestore();
		});

		it('does not throw when fetch throws with external traceId', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
				response: { modelId: 'gpt-5-mini', id: 'resp-123', timestamp: new Date() },
				usage: { inputTokens: 100, outputTokens: 50 },
			} as Awaited<ReturnType<typeof generateText>>);

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const issue = new Issue(1, {
				subject: 'Subject',
				description: 'Description',
				authorName: 'Author',
				link: '',
			});

			const service = new AiSummarizeService(mockModel, langfuseService);
			service.setTraceId('external-trace');
			const result = await service.execute(issue);

			expect(result).toBe('Summary');
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});
});
