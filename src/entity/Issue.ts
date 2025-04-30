import { Journal } from './Journal';

export enum IssueType {
	Feature = 'Feature',
	Bug = 'Bug',
	Misc = 'Misc',
	Unknown = 'Unknown',
}

export class Issue {
	private _subject: string = '';
	private _type: IssueType = IssueType.Unknown;
	private _description: string = '';
	private _link: string = '';
	private _journals: Journal[] = [];

	constructor(public readonly id: number) {}

	get subject(): string {
		return this._subject;
	}

	set subject(subject: string) {
		this._subject = subject;
	}

	get type(): IssueType {
		return this._type;
	}

	set type(type: IssueType) {
		this._type = type;
	}

	get description(): string {
		return this._description;
	}

	set description(description: string) {
		this._description = description;
	}

	get link(): string {
		return this._link;
	}

	set link(link: string) {
		this._link = link;
	}

	get journals(): Journal[] {
		return [...this._journals];
	}

	addJournal(journal: Journal): void {
		if (!journal.isValid()) {
			return;
		}

		this._journals = [...this._journals, journal];
	}

	isValid(): boolean {
		return this._subject.length > 0 && this._description.length > 0;
	}
}
