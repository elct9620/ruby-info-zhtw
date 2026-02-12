import { Issue, IssueType } from '@/entity/Issue';

export interface IssueRepository {
	findById(id: number): Promise<Issue | null>;
}

export interface SummarizeService {
	execute(issue: Issue): Promise<string>;
}

export interface SummarizePresenter {
	setTitle(title: string): void;
	setType(type: IssueType): void;
	setLink(link: string): void;
	setDescription(description: string): void;
	render(): Promise<void>;
}
