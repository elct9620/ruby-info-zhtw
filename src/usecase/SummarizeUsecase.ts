import { IssueRepository, SummarizePresenter, SummarizeService } from './interface';

export class SummarizeUsecase {
	constructor(
		private readonly issueRepository: IssueRepository,
		private readonly summarizeService: SummarizeService,
		private readonly summarizePresenter: SummarizePresenter,
	) {}

	async execute(issueId: number): Promise<void> {}
}
