export class Journal {
	readonly id: number;
	readonly userName: string;
	readonly notes: string;

	constructor(id: number, userName: string, notes: string) {
		this.id = id;
		this.userName = userName;
		this.notes = notes;
	}

	isValid(): boolean {
		return this.userName.length > 0 && this.notes.length > 0;
	}
}
