import { Issue } from '@/entity/Issue';
import { LangfuseService } from '@/service/LangfuseService';
import { IssueRepository } from '@/usecase/interface';

/**
 * Wraps an IssueRepository with Langfuse span tracing for observability.
 */
export class SpanTrackedIssueRepository implements IssueRepository {
	constructor(
		private readonly repository: IssueRepository,
		private readonly langfuseService: LangfuseService,
		private readonly traceId: string
	) {}

	async findById(id: number): Promise<Issue | null> {
		const startTime = new Date();
		const issue = await this.repository.findById(id);
		const endTime = new Date();

		try {
			await this.langfuseService.createSpan({
				id: crypto.randomUUID(),
				traceId: this.traceId,
				name: 'fetch-issue',
				startTime,
				endTime,
				input: { issueId: id },
				output: { found: !!issue, subject: issue?.subject },
			});
		} catch (error) {
			console.error('Failed to create fetch-issue span:', error);
		}

		return issue;
	}
}
