import { Issue } from '@/entity/Issue';

export interface IssueRepository {
	findById(id: number): Promise<Issue | null>;
}

export interface SummarizeService {
	execute(issue: Issue): Promise<string>;
}

export interface SummarizePresenter {
	setTitle(title: string): void;
	setLink(link: string): void;
	setDescription(description: string): void;
}
