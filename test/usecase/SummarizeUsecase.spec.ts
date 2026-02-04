import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SummarizeUsecase } from '@/usecase/SummarizeUsecase';
import { IssueRepository, SummarizeService, SummarizePresenter } from '@/usecase/interface';
import { Issue, IssueType } from '@/entity/Issue';
import { Journal } from '@/entity/Journal';

describe('SummarizeUsecase', () => {
	let mockRepository: IssueRepository;
	let mockService: SummarizeService;
	let mockPresenter: SummarizePresenter;

	beforeEach(() => {
		mockRepository = {
			findById: vi.fn(),
		};
		mockService = {
			execute: vi.fn(),
		};
		mockPresenter = {
			setTitle: vi.fn(),
			setDescription: vi.fn(),
			setLink: vi.fn(),
			setType: vi.fn(),
		};
	});

	describe('execute', () => {
		it('fetches issue, generates summary, and sets presenter values', async () => {
			const issue = new Issue(12345);
			issue.subject = 'Test Issue Subject';
			issue.description = 'Test description';
			issue.link = 'https://bugs.ruby-lang.org/issues/12345';
			issue.type = IssueType.Feature;

			vi.mocked(mockRepository.findById).mockResolvedValue(issue);
			vi.mocked(mockService.execute).mockResolvedValue('Generated summary text');

			const usecase = new SummarizeUsecase(mockRepository, mockService, mockPresenter);
			await usecase.execute(12345);

			expect(mockRepository.findById).toHaveBeenCalledWith(12345);
			expect(mockService.execute).toHaveBeenCalledWith(issue);
			expect(mockPresenter.setTitle).toHaveBeenCalledWith('Test Issue Subject');
			expect(mockPresenter.setDescription).toHaveBeenCalledWith('Generated summary text');
			expect(mockPresenter.setLink).toHaveBeenCalledWith('https://bugs.ruby-lang.org/issues/12345');
			expect(mockPresenter.setType).toHaveBeenCalledWith(IssueType.Feature);
		});

		it('throws error when issue is not found', async () => {
			vi.mocked(mockRepository.findById).mockResolvedValue(null);

			const usecase = new SummarizeUsecase(mockRepository, mockService, mockPresenter);

			await expect(usecase.execute(99999)).rejects.toThrow('Failed to fetch issue with ID: 99999');
			expect(mockService.execute).not.toHaveBeenCalled();
			expect(mockPresenter.setTitle).not.toHaveBeenCalled();
		});

		it('handles issue with journals correctly', async () => {
			const issue = new Issue(12345);
			issue.subject = 'Issue with journals';
			issue.description = 'Description';
			issue.link = 'https://bugs.ruby-lang.org/issues/12345';
			issue.type = IssueType.Bug;
			issue.authorName = 'Author';

			const journal = new Journal(1);
			journal.userName = 'Commenter';
			journal.notes = 'This is a comment';
			issue.addJournal(journal);

			vi.mocked(mockRepository.findById).mockResolvedValue(issue);
			vi.mocked(mockService.execute).mockResolvedValue('Summary with journals');

			const usecase = new SummarizeUsecase(mockRepository, mockService, mockPresenter);
			await usecase.execute(12345);

			expect(mockService.execute).toHaveBeenCalledWith(issue);
			expect(mockPresenter.setType).toHaveBeenCalledWith(IssueType.Bug);
		});

		it('passes correct issue type to presenter for Misc type', async () => {
			const issue = new Issue(12345);
			issue.subject = 'Misc Issue';
			issue.description = 'Description';
			issue.link = 'https://bugs.ruby-lang.org/issues/12345';
			issue.type = IssueType.Misc;

			vi.mocked(mockRepository.findById).mockResolvedValue(issue);
			vi.mocked(mockService.execute).mockResolvedValue('Summary');

			const usecase = new SummarizeUsecase(mockRepository, mockService, mockPresenter);
			await usecase.execute(12345);

			expect(mockPresenter.setType).toHaveBeenCalledWith(IssueType.Misc);
		});

		it('passes correct issue type to presenter for Unknown type', async () => {
			const issue = new Issue(12345);
			issue.subject = 'Unknown Issue';
			issue.description = 'Description';
			issue.link = 'https://bugs.ruby-lang.org/issues/12345';
			issue.type = IssueType.Unknown;

			vi.mocked(mockRepository.findById).mockResolvedValue(issue);
			vi.mocked(mockService.execute).mockResolvedValue('Summary');

			const usecase = new SummarizeUsecase(mockRepository, mockService, mockPresenter);
			await usecase.execute(12345);

			expect(mockPresenter.setType).toHaveBeenCalledWith(IssueType.Unknown);
		});
	});
});
