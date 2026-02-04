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

			return this.mapIssueResponse(issue);
		} catch (error) {
			console.error('Error fetching issue:', error);
			return null;
		}
	}

	private mapIssueResponse(data: IssueSchema): Issue {
		const issue = new Issue(data.id);
		issue.subject = data.subject;
		issue.description = data.description;
		issue.link = `${RestIssueRepository.API_URL}/${data.id}`;
		issue.type = this.mapTrackerToIssueType(data.tracker?.name);
		issue.authorName = data.author.name;

		if (data.assigned_to?.name) {
			issue.assignTo(data.assigned_to.name);
		}

		this.mapJournals(data.journals).forEach((journal) => issue.addJournal(journal));

		return issue;
	}

	private mapJournals(journals?: JournalSchema[]): Journal[] {
		if (!journals || !Array.isArray(journals)) {
			return [];
		}

		return journals.map((journalData) => {
			const journal = new Journal(journalData.id);
			journal.userName = journalData.user.name;
			journal.notes = journalData.notes || '';
			return journal;
		});
	}

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
