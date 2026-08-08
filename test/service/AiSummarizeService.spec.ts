import { Issue, IssueType } from '@/entity/Issue';
import { Journal } from '@/entity/Journal';
import { AiSummarizeService } from '@/service/AiSummarizeService';
import { Telemetry } from '@/telemetry/Telemetry';
import { generateText, LanguageModel } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('ai', () => ({
	generateText: vi.fn(),
}));

describe('AiSummarizeService', () => {
	let mockModel: LanguageModel;
	let telemetry: Telemetry;

	function createService() {
		return new AiSummarizeService(mockModel, telemetry);
	}

	function promptOf(call = 0) {
		return vi.mocked(generateText).mock.calls[call][0].prompt;
	}

	beforeEach(() => {
		mockModel = {} as LanguageModel;
		telemetry = Telemetry.create({});
		vi.mocked(generateText).mockReset();
		vi.mocked(generateText).mockResolvedValue({ text: 'Generated summary text' } as Awaited<ReturnType<typeof generateText>>);
	});

	describe('execute', () => {
		it('should return the generated summary', async () => {
			const issue = new Issue(12345, {
				subject: 'Test Subject',
				description: 'Test Description',
				type: IssueType.Feature,
				authorName: 'Test Author',
				link: '',
			});

			const result = await createService().execute(issue);

			expect(result).toBe('Generated summary text');
		});

		it('should pass the configured model to the AI SDK', async () => {
			const issue = new Issue(1, { subject: 'Subject', description: 'Description', authorName: 'Author', link: '' });

			await createService().execute(issue);

			expect(generateText).toHaveBeenCalledWith(expect.objectContaining({ model: mockModel }));
		});

		it('should trace the generation through the AI SDK telemetry integration', async () => {
			const issue = new Issue(1, { subject: 'Subject', description: 'Description', authorName: 'Author', link: '' });

			await createService().execute(issue);

			expect(generateText).toHaveBeenCalledWith(
				expect.objectContaining({
					telemetry: { integrations: telemetry.integration, functionId: 'summarize-issue' },
				}),
			);
		});
	});

	describe('prompt', () => {
		it('should include the subject', async () => {
			const issue = new Issue(1, { subject: 'Test Subject', description: 'Description', authorName: 'Author', link: '' });

			await createService().execute(issue);

			expect(promptOf()).toContain('Test Subject');
		});

		it('should include the author name', async () => {
			const issue = new Issue(1, { subject: 'Subject', description: 'Description', authorName: 'John Doe', link: '' });

			await createService().execute(issue);

			expect(promptOf()).toContain('John Doe');
		});

		it('should include the assignee name when present', async () => {
			const issue = new Issue(1, {
				subject: 'Subject',
				description: 'Description',
				authorName: 'Author',
				assigneeName: 'Assignee Name',
				link: '',
			});

			await createService().execute(issue);

			expect(promptOf()).toContain('Assignee Name');
		});

		it('should include the issue type', async () => {
			const issue = new Issue(1, {
				subject: 'Subject',
				description: 'Description',
				type: IssueType.Bug,
				authorName: 'Author',
				link: '',
			});

			await createService().execute(issue);

			expect(promptOf()).toContain('Bug');
		});

		it('should include the description', async () => {
			const issue = new Issue(1, {
				subject: 'Subject',
				description: 'Detailed issue description with technical details',
				authorName: 'Author',
				link: '',
			});

			await createService().execute(issue);

			expect(promptOf()).toContain('Detailed issue description with technical details');
		});

		it('should include the latest journal when journals exist', async () => {
			const issue = new Issue(1, {
				subject: 'Subject',
				description: 'Description',
				authorName: 'Author',
				link: '',
				journals: [new Journal(1, 'First Commenter', 'First comment'), new Journal(2, 'Latest Commenter', 'Latest comment notes')],
			});

			await createService().execute(issue);

			expect(promptOf()).toContain('Latest Commenter');
			expect(promptOf()).toContain('Latest comment notes');
		});

		it('should include every journal', async () => {
			const issue = new Issue(1, {
				subject: 'Subject',
				description: 'Description',
				authorName: 'Author',
				link: '',
				journals: [new Journal(1, 'User One', 'Comment One'), new Journal(2, 'User Two', 'Comment Two')],
			});

			await createService().execute(issue);

			expect(promptOf()).toContain('User One');
			expect(promptOf()).toContain('Comment One');
			expect(promptOf()).toContain('User Two');
			expect(promptOf()).toContain('Comment Two');
		});

		it('should render without journals when the issue has none', async () => {
			const issue = new Issue(1, { subject: 'Subject', description: 'Description', authorName: 'Author', link: '' });

			const result = await createService().execute(issue);

			expect(result).toBe('Generated summary text');
			expect(generateText).toHaveBeenCalled();
		});
	});
});
