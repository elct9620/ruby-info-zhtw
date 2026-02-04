import { describe, expect, it } from 'vitest';
import { Issue, IssueType } from '@/entity/Issue';
import { Journal } from '@/entity/Journal';

describe('Issue', () => {
	describe('constructor', () => {
		it('creates an issue with the given id', () => {
			const issue = new Issue(456);
			expect(issue.id).toBe(456);
		});

		it('initializes with default values', () => {
			const issue = new Issue(1);
			expect(issue.subject).toBe('');
			expect(issue.type).toBe(IssueType.Unknown);
			expect(issue.description).toBe('');
			expect(issue.authorName).toBe('');
			expect(issue.assigneeName).toBeNull();
			expect(issue.link).toBe('');
			expect(issue.journals).toEqual([]);
		});
	});

	describe('subject', () => {
		it('can be set and retrieved', () => {
			const issue = new Issue(1);
			issue.subject = 'Test subject';
			expect(issue.subject).toBe('Test subject');
		});
	});

	describe('type', () => {
		it('can be set and retrieved', () => {
			const issue = new Issue(1);
			issue.type = IssueType.Bug;
			expect(issue.type).toBe(IssueType.Bug);
		});

		it('supports all IssueType values', () => {
			const issue = new Issue(1);

			issue.type = IssueType.Feature;
			expect(issue.type).toBe(IssueType.Feature);

			issue.type = IssueType.Misc;
			expect(issue.type).toBe(IssueType.Misc);

			issue.type = IssueType.Unknown;
			expect(issue.type).toBe(IssueType.Unknown);
		});
	});

	describe('description', () => {
		it('can be set and retrieved', () => {
			const issue = new Issue(1);
			issue.description = 'Test description';
			expect(issue.description).toBe('Test description');
		});
	});

	describe('authorName', () => {
		it('can be set and retrieved', () => {
			const issue = new Issue(1);
			issue.authorName = 'John Doe';
			expect(issue.authorName).toBe('John Doe');
		});
	});

	describe('assignTo and assigneeName', () => {
		it('can assign a user', () => {
			const issue = new Issue(1);
			issue.assignTo('Jane Doe');
			expect(issue.assigneeName).toBe('Jane Doe');
		});

		it('can assign null to unassign', () => {
			const issue = new Issue(1);
			issue.assignTo('Jane Doe');
			issue.assignTo(null);
			expect(issue.assigneeName).toBeNull();
		});
	});

	describe('isAssigned', () => {
		it('returns false when no one is assigned', () => {
			const issue = new Issue(1);
			expect(issue.isAssigned()).toBe(false);
		});

		it('returns true when someone is assigned', () => {
			const issue = new Issue(1);
			issue.assignTo('Jane Doe');
			expect(issue.isAssigned()).toBe(true);
		});
	});

	describe('link', () => {
		it('can be set and retrieved', () => {
			const issue = new Issue(1);
			issue.link = 'https://example.com/issues/1';
			expect(issue.link).toBe('https://example.com/issues/1');
		});
	});

	describe('journals', () => {
		it('returns a copy of the journals array', () => {
			const issue = new Issue(1);
			const journal = new Journal(1);
			journal.userName = 'Alice';
			journal.notes = 'Some notes';
			issue.addJournal(journal);

			const journals = issue.journals;
			journals.push(new Journal(2));

			expect(issue.journals).toHaveLength(1);
		});
	});

	describe('addJournal', () => {
		it('adds a valid journal', () => {
			const issue = new Issue(1);
			const journal = new Journal(1);
			journal.userName = 'Alice';
			journal.notes = 'Some notes';

			issue.addJournal(journal);

			expect(issue.journals).toHaveLength(1);
			expect(issue.journals[0].id).toBe(1);
		});

		it('does not add an invalid journal', () => {
			const issue = new Issue(1);
			const journal = new Journal(1);

			issue.addJournal(journal);

			expect(issue.journals).toHaveLength(0);
		});

		it('adds multiple valid journals', () => {
			const issue = new Issue(1);

			const journal1 = new Journal(1);
			journal1.userName = 'Alice';
			journal1.notes = 'Note 1';

			const journal2 = new Journal(2);
			journal2.userName = 'Bob';
			journal2.notes = 'Note 2';

			issue.addJournal(journal1);
			issue.addJournal(journal2);

			expect(issue.journals).toHaveLength(2);
		});
	});

	describe('isValid', () => {
		it('returns false when subject is empty', () => {
			const issue = new Issue(1);
			issue.description = 'Test description';
			expect(issue.isValid()).toBe(false);
		});

		it('returns false when description is empty', () => {
			const issue = new Issue(1);
			issue.subject = 'Test subject';
			expect(issue.isValid()).toBe(false);
		});

		it('returns false when both subject and description are empty', () => {
			const issue = new Issue(1);
			expect(issue.isValid()).toBe(false);
		});

		it('returns true when both subject and description are non-empty', () => {
			const issue = new Issue(1);
			issue.subject = 'Test subject';
			issue.description = 'Test description';
			expect(issue.isValid()).toBe(true);
		});
	});
});

describe('IssueType', () => {
	it('has the expected values', () => {
		expect(IssueType.Feature).toBe('Feature');
		expect(IssueType.Bug).toBe('Bug');
		expect(IssueType.Misc).toBe('Misc');
		expect(IssueType.Unknown).toBe('Unknown');
	});
});
