import { Journal } from './Journal';

export class Issue {
	private _subject: string = '';
	private _description: string = '';
	private _journals: Journal[] = [];

	constructor(public readonly id: number) {}

	get subject(): string {
		return this._subject;
	}

	set subject(subject: string) {
		this._subject = subject;
	}

	get description(): string {
		return this._description;
	}

	set description(description: string) {
		this._description = description;
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
