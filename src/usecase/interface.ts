import { Issue, IssueType } from '@/entity/Issue';

export interface IssueRepository {
	findById(id: number): Promise<Issue | null>;
}

export interface SummarizeService {
	execute(issue: Issue): Promise<string>;
}

export interface SummarizeResult {
	title: string;
	type: IssueType;
	link: string;
	description: string;
}

export interface SummarizePresenter {
	render(result: SummarizeResult): Promise<void>;
}
