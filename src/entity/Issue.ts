export class Issue {
	private _subject: string = '';
	private _description: string = '';

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

	isValid(): boolean {
		return this._subject.length > 0 && this._description.length > 0;
	}
}
