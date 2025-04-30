import { Issue } from '@/entity/Issue';
import { IssueRepository } from '@/usecase/interface';

type JournalSchema = {
	id: number;
	user: {
		id: number;
		name: string;
	};
	notes: string;
};

type IssueSchema = {
	id: number;
	subject: string;
	description: string;
	journals: JournalSchema[];
};

type IssueResponse = {
	issue: IssueSchema;
};

export class RestIssueRepository implements IssueRepository {
	public static readonly API_URL = 'https://bugs.ruby-lang.org/issues';

	async findById(id: number): Promise<Issue | null> {
		try {
			const url = `${RestIssueRepository.API_URL}/${id}.json?include=journals`;
			console.log(`Fetching issue from ${url}`);

			const response = await fetch(url);
			if (!response.ok) {
				console.error(`Failed to fetch issue: ${response.status} ${response.statusText}`);
				return null;
			}

			const { issue } = (await response.json()) as IssueResponse;

			if (!issue) {
				console.error('No issue data found in the response');
				return null;
			}

			const issueEntity = new Issue(issue.id);
			issueEntity.subject = issue.subject;
			issueEntity.description = issue.description;
			return issueEntity;
		} catch (error) {
			console.error('Error fetching issue:', error);
			return null;
		}
	}
}
