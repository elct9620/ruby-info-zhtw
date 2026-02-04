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

			const issue = new Issue(12345);
			issue.subject = 'Test Subject';
			issue.description = 'Test Description';
			issue.type = IssueType.Feature;
			issue.authorName = 'Test Author';

			const service = new AiSummarizeService(mockModel);
			const result = await service.execute(issue);

			expect(result).toBe('Generated summary text');
			expect(generateText).toHaveBeenCalledWith({
				model: mockModel,
				prompt: expect.stringContaining('Test Subject'),
				temperature: 1,
			});
		});

		it('includes author name in prompt', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(1);
			issue.subject = 'Subject';
			issue.description = 'Description';
			issue.authorName = 'John Doe';

			const service = new AiSummarizeService(mockModel);
			await service.execute(issue);

			const promptArg = vi.mocked(generateText).mock.calls[0][0].prompt;
			expect(promptArg).toContain('John Doe');
		});

		it('includes assignee name when present', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(1);
			issue.subject = 'Subject';
			issue.description = 'Description';
			issue.authorName = 'Author';
			issue.assignTo('Assignee Name');

			const service = new AiSummarizeService(mockModel);
			await service.execute(issue);

			const promptArg = vi.mocked(generateText).mock.calls[0][0].prompt;
			expect(promptArg).toContain('Assignee Name');
		});

		it('includes issue type in prompt', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(1);
			issue.subject = 'Subject';
			issue.description = 'Description';
			issue.type = IssueType.Bug;
			issue.authorName = 'Author';

			const service = new AiSummarizeService(mockModel);
			await service.execute(issue);

			const promptArg = vi.mocked(generateText).mock.calls[0][0].prompt;
			expect(promptArg).toContain('Bug');
		});

		it('includes description in prompt', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(1);
			issue.subject = 'Subject';
			issue.description = 'Detailed issue description with technical details';
			issue.authorName = 'Author';

			const service = new AiSummarizeService(mockModel);
			await service.execute(issue);

			const promptArg = vi.mocked(generateText).mock.calls[0][0].prompt;
			expect(promptArg).toContain('Detailed issue description with technical details');
		});

		it('includes latest journal when journals exist', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary with journal',
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(1);
			issue.subject = 'Subject';
			issue.description = 'Description';
			issue.authorName = 'Author';

			const journal1 = new Journal(1);
			journal1.userName = 'First Commenter';
			journal1.notes = 'First comment';
			issue.addJournal(journal1);

			const journal2 = new Journal(2);
			journal2.userName = 'Latest Commenter';
			journal2.notes = 'Latest comment notes';
			issue.addJournal(journal2);

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

			const issue = new Issue(1);
			issue.subject = 'Subject';
			issue.description = 'Description';
			issue.authorName = 'Author';

			const journal1 = new Journal(1);
			journal1.userName = 'User One';
			journal1.notes = 'Comment One';
			issue.addJournal(journal1);

			const journal2 = new Journal(2);
			journal2.userName = 'User Two';
			journal2.notes = 'Comment Two';
			issue.addJournal(journal2);

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

			const issue = new Issue(1);
			issue.subject = 'Subject';
			issue.description = 'Description';
			issue.authorName = 'Author';

			const service = new AiSummarizeService(mockModel);
			const result = await service.execute(issue);

			expect(result).toBe('Summary without journals');
			expect(generateText).toHaveBeenCalled();
		});

		it('uses temperature of 1 for generation', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(1);
			issue.subject = 'Subject';
			issue.description = 'Description';
			issue.authorName = 'Author';

			const service = new AiSummarizeService(mockModel);
			await service.execute(issue);

			expect(generateText).toHaveBeenCalledWith(
				expect.objectContaining({
					temperature: 1,
				})
			);
		});

		it('passes the model to generateText', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(1);
			issue.subject = 'Subject';
			issue.description = 'Description';
			issue.authorName = 'Author';

			const service = new AiSummarizeService(mockModel);
			await service.execute(issue);

			expect(generateText).toHaveBeenCalledWith(
				expect.objectContaining({
					model: mockModel,
				})
			);
		});

		it('calls langfuse service when provided', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
				response: { modelId: 'gpt-5-mini', id: 'resp-123', timestamp: new Date() },
				usage: { inputTokens: 100, outputTokens: 50 },
			} as Awaited<ReturnType<typeof generateText>>);

			const mockLangfuse = {
				traceGeneration: vi.fn().mockResolvedValue(undefined),
			} as unknown as LangfuseService;

			const issue = new Issue(12345);
			issue.subject = 'Subject';
			issue.description = 'Description';
			issue.authorName = 'Author';

			const service = new AiSummarizeService(mockModel, mockLangfuse);
			await service.execute(issue);

			expect(mockLangfuse.traceGeneration).toHaveBeenCalledWith(
				expect.objectContaining({
					traceName: 'summarize-issue',
					model: 'gpt-5-mini',
					usage: { inputTokens: 100, outputTokens: 50 },
					metadata: { issueId: 12345 },
				})
			);
		});

		it('does not throw when langfuse service fails', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
				response: { modelId: 'gpt-5-mini', id: 'resp-123', timestamp: new Date() },
				usage: { inputTokens: 100, outputTokens: 50 },
			} as Awaited<ReturnType<typeof generateText>>);

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const mockLangfuse = {
				traceGeneration: vi.fn().mockRejectedValue(new Error('Langfuse error')),
			} as unknown as LangfuseService;

			const issue = new Issue(1);
			issue.subject = 'Subject';
			issue.description = 'Description';
			issue.authorName = 'Author';

			const service = new AiSummarizeService(mockModel, mockLangfuse);
			const result = await service.execute(issue);

			expect(result).toBe('Summary');
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		it('works without langfuse service', async () => {
			vi.mocked(generateText).mockResolvedValue({
				text: 'Summary',
			} as Awaited<ReturnType<typeof generateText>>);

			const issue = new Issue(1);
			issue.subject = 'Subject';
			issue.description = 'Description';
			issue.authorName = 'Author';

			const service = new AiSummarizeService(mockModel);
			const result = await service.execute(issue);

			expect(result).toBe('Summary');
		});
	});
});
