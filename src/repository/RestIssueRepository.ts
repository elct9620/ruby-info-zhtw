import { Issue } from '@/entity/Issue';
import { IssueRepository } from '@/usecase/interface';

type IssueSchema = {
	id: number;
	subject: string;
	description: string;
};

type IssueResponse = {
	issue: IssueSchema;
};

export class RestIssueRepository implements IssueRepository {
	public static readonly API_URL = 'https://bugs.ruby-lang.org/issues';

	async findById(id: number): Promise<Issue | null> {
		return null;
	}
}
