import { Issue, IssueType } from '@/entity/Issue';
import { Journal } from '@/entity/Journal';
import { Logger } from '@/service/Logger';
import { IssueRepository } from '@/usecase/interface';

const logger = new Logger('RestIssueRepository');

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
			logger.info('Fetching issue', { url, issueId: id });

			const response = await fetch(url);
			if (!response.ok) {
				logger.error('Failed to fetch issue', { statusCode: response.status, url });
				return null;
			}

			const { issue } = (await response.json()) as IssueResponse;

			if (!issue) {
				logger.error('No issue data found in the response', { issueId: id });
				return null;
			}

			return this.mapIssueResponse(issue);
		} catch (error) {
			logger.error('Error fetching issue', { error: error instanceof Error ? error.message : String(error) });
			return null;
		}
	}

	private mapIssueResponse(data: IssueSchema): Issue {
		return new Issue(data.id, {
			subject: data.subject,
			description: data.description,
			link: `${RestIssueRepository.API_URL}/${data.id}`,
			type: this.mapTrackerToIssueType(data.tracker?.name),
			authorName: data.author.name,
			assigneeName: data.assigned_to?.name ?? null,
			journals: this.mapJournals(data.journals),
		});
	}

	private mapJournals(journals?: JournalSchema[]): Journal[] {
		if (!journals || !Array.isArray(journals)) {
			return [];
		}

		return journals.map((journalData) => new Journal(journalData.id, journalData.user.name, journalData.notes || ''));
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
