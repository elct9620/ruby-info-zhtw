import { IssueRepository, SummarizePresenter, SummarizeService } from './interface';

export class SummarizeUsecase {
	constructor(
		private readonly issueRepository: IssueRepository,
		private readonly summarizeService: SummarizeService,
		private readonly summarizePresenter: SummarizePresenter,
	) {}

	async execute(issueId: number): Promise<void> {
		const issue = await this.issueRepository.findById(issueId);
		if (!issue) {
			throw new Error(`Failed to fetch issue with ID: ${issueId}`);
		}

		const text = await this.summarizeService.execute(issue);

		this.summarizePresenter.setTitle(issue.subject);
		this.summarizePresenter.setDescription(text);
		this.summarizePresenter.setLink(issue.link);
		this.summarizePresenter.setType(issue.type);

		await this.summarizePresenter.render();
	}
}
