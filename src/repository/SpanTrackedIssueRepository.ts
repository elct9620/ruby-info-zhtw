import { Issue } from '@/entity/Issue';
import { withSpan } from '@/telemetry/withSpan';
import { IssueRepository } from '@/usecase/interface';
import type { Tracer } from '@opentelemetry/api';

/**
 * Wraps an IssueRepository so the Bug Tracker call appears as its own span in
 * the surrounding trace.
 */
export class SpanTrackedIssueRepository implements IssueRepository {
	constructor(
		private readonly repository: IssueRepository,
		private readonly tracer: Tracer,
	) {}

	async findById(id: number): Promise<Issue | null> {
		return withSpan(
			this.tracer,
			{
				name: 'fetch-issue',
				input: { issueId: id },
				output: (issue) => ({ found: issue !== null, subject: issue?.subject }),
			},
			() => this.repository.findById(id),
		);
	}
}
