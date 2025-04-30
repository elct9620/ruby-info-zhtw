export class Journal {
	private _userName: string = '';
	private _notes: string = '';

	constructor(public readonly id: number) {}

	get userName(): string {
		return this._userName;
	}

	get notes(): string {
		return this._notes;
	}

	set userName(userName: string) {
		this._userName = userName;
	}

	set notes(notes: string) {
		this._notes = notes;
	}

	isValid(): boolean {
		return this._userName.length > 0 && this._notes.length > 0;
	}
}
