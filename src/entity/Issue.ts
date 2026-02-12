import { Journal } from './Journal';

export enum IssueType {
	Feature = 'Feature',
	Bug = 'Bug',
	Misc = 'Misc',
	Unknown = 'Unknown',
}

export interface IssueProps {
	subject: string;
	type?: IssueType;
	description: string;
	authorName: string;
	assigneeName?: string | null;
	link: string;
	journals?: Journal[];
}

export class Issue {
	readonly id: number;
	readonly subject: string;
	readonly type: IssueType;
	readonly description: string;
	readonly authorName: string;
	readonly assigneeName: string | null;
	readonly link: string;
	private readonly _journals: Journal[];

	constructor(id: number, props: IssueProps) {
		this.id = id;
		this.subject = props.subject;
		this.type = props.type ?? IssueType.Unknown;
		this.description = props.description;
		this.authorName = props.authorName;
		this.assigneeName = props.assigneeName ?? null;
		this.link = props.link;
		this._journals = (props.journals ?? []).filter((j) => j.isValid());
	}

	isAssigned(): boolean {
		return this.assigneeName !== null;
	}

	get journals(): Journal[] {
		return [...this._journals];
	}

	isValid(): boolean {
		return this.subject.length > 0 && this.description.length > 0;
	}
}
