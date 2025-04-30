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
		try {
			const url = `${RestIssueRepository.API_URL}/${id}.json?include=journals`;
			console.log(`Fetching issue from ${url}`);
			
			const response = await fetch(url);
			if (!response.ok) {
				console.error(`Failed to fetch issue: ${response.status} ${response.statusText}`);
				return null;
			}
			
			const { issue } = await response.json() as IssueResponse;
			
			if (!issue) {
				console.error('No issue data found in the response');
				return null;
			}
			
			return new Issue(issue.id, issue.subject, issue.description);
		} catch (error) {
			console.error('Error fetching issue:', error);
			return null;
		}
	}
	
	/**
	 * Extract issue ID from a Ruby issue URL
	 * @param url The Ruby issue URL (e.g., https://bugs.ruby-lang.org/issues/12345)
	 * @returns The issue ID as a number, or null if not found
	 */
	static extractIssueIdFromUrl(url: string): number | null {
		const match = url.match(/https:\/\/bugs\.ruby-lang\.org\/issues\/(\d+)/);
		return match ? parseInt(match[1], 10) : null;
	}
}
