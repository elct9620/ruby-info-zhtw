import { Issue, IssueType } from '@/entity/Issue';
import { Journal } from '@/entity/Journal';
import { IssueRepository } from '@/usecase/interface';

type UserSchema = {
	id: number;
	name: string;
};

type JournalSchema = {
	id: number;
	user: UserSchema;
	notes: string;
};

type IssueSchema = {
	id: number;
	tracker: {
		name: string;
	};
	subject: string;
	description: string;
	author: UserSchema;
	assigned_to?: UserSchema;
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
			issueEntity.link = `${RestIssueRepository.API_URL}/${issue.id}`;
			issueEntity.type = this.mapTrackerToIssueType(issue.tracker?.name);
			
			// 設置作者信息
			if (issue.author && issue.author.name) {
				issueEntity.authorName = issue.author.name;
			}
			
			// 設置指派者信息
			if (issue.assigned_to && issue.assigned_to.name) {
				issueEntity.assignTo(issue.assigned_to.name);
			}

			if (issue.journals && Array.isArray(issue.journals)) {
				for (const journalData of issue.journals) {
					const journal = new Journal(journalData.id);
					journal.userName = journalData.user?.name || '';
					journal.notes = journalData.notes || '';
					issueEntity.addJournal(journal);
				}
			}

			return issueEntity;
		} catch (error) {
			console.error('Error fetching issue:', error);
			return null;
		}
	}

	/**
	 * Maps tracker name from the API to IssueType enum
	 * @param trackerName The tracker name from the API
	 * @returns The corresponding IssueType
	 */
	private mapTrackerToIssueType(trackerName?: string): IssueType {
		if (!trackerName) return IssueType.Unknown;

		switch (trackerName.toLowerCase()) {
			case 'feature':
				return IssueType.Feature;
			case 'bug':
				return IssueType.Bug;
			case 'misc':
				return IssueType.Misc;
			default:
				return IssueType.Unknown;
		}
	}
}
