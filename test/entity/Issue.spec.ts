import { describe, expect, it } from 'vitest';
import { Issue, IssueType } from '@/entity/Issue';
import { Journal } from '@/entity/Journal';

describe('Issue', () => {
	describe('constructor', () => {
		it('creates an issue with the given id', () => {
			const issue = new Issue(456, { subject: 'Test', description: 'Desc', authorName: 'Author', link: '' });
			expect(issue.id).toBe(456);
		});

		it('initializes with provided values', () => {
			const issue = new Issue(1, {
				subject: 'Test subject',
				type: IssueType.Bug,
				description: 'Test description',
				authorName: 'John Doe',
				assigneeName: 'Jane Doe',
				link: 'https://example.com',
			});
			expect(issue.subject).toBe('Test subject');
			expect(issue.type).toBe(IssueType.Bug);
			expect(issue.description).toBe('Test description');
			expect(issue.authorName).toBe('John Doe');
			expect(issue.assigneeName).toBe('Jane Doe');
			expect(issue.link).toBe('https://example.com');
		});

		it('defaults type to Unknown when not provided', () => {
			const issue = new Issue(1, { subject: 'Test', description: 'Desc', authorName: 'Author', link: '' });
			expect(issue.type).toBe(IssueType.Unknown);
		});

		it('defaults assigneeName to null when not provided', () => {
			const issue = new Issue(1, { subject: 'Test', description: 'Desc', authorName: 'Author', link: '' });
			expect(issue.assigneeName).toBeNull();
		});

		it('defaults journals to empty array when not provided', () => {
			const issue = new Issue(1, { subject: 'Test', description: 'Desc', authorName: 'Author', link: '' });
			expect(issue.journals).toEqual([]);
		});
	});

	describe('type', () => {
		it('supports all IssueType values', () => {
			const feature = new Issue(1, { subject: 'Test', description: 'Desc', authorName: 'Author', link: '', type: IssueType.Feature });
			expect(feature.type).toBe(IssueType.Feature);

			const misc = new Issue(2, { subject: 'Test', description: 'Desc', authorName: 'Author', link: '', type: IssueType.Misc });
			expect(misc.type).toBe(IssueType.Misc);

			const unknown = new Issue(3, { subject: 'Test', description: 'Desc', authorName: 'Author', link: '', type: IssueType.Unknown });
			expect(unknown.type).toBe(IssueType.Unknown);
		});
	});

	describe('isAssigned', () => {
		it('returns false when no one is assigned', () => {
			const issue = new Issue(1, { subject: 'Test', description: 'Desc', authorName: 'Author', link: '' });
			expect(issue.isAssigned()).toBe(false);
		});

		it('returns true when someone is assigned', () => {
			const issue = new Issue(1, { subject: 'Test', description: 'Desc', authorName: 'Author', link: '', assigneeName: 'Jane Doe' });
			expect(issue.isAssigned()).toBe(true);
		});
	});

	describe('journals', () => {
		it('returns a copy of the journals array', () => {
			const journal = new Journal(1, 'Alice', 'Some notes');
			const issue = new Issue(1, { subject: 'Test', description: 'Desc', authorName: 'Author', link: '', journals: [journal] });

			const journals = issue.journals;
			journals.push(new Journal(2, 'Bob', 'Other notes'));

			expect(issue.journals).toHaveLength(1);
		});

		it('filters out invalid journals during construction', () => {
			const valid = new Journal(1, 'Alice', 'Some notes');
			const invalid = new Journal(2, '', '');
			const issue = new Issue(1, { subject: 'Test', description: 'Desc', authorName: 'Author', link: '', journals: [valid, invalid] });

			expect(issue.journals).toHaveLength(1);
			expect(issue.journals[0].id).toBe(1);
		});

		it('stores multiple valid journals', () => {
			const journal1 = new Journal(1, 'Alice', 'Note 1');
			const journal2 = new Journal(2, 'Bob', 'Note 2');
			const issue = new Issue(1, { subject: 'Test', description: 'Desc', authorName: 'Author', link: '', journals: [journal1, journal2] });

			expect(issue.journals).toHaveLength(2);
		});
	});

	describe('isValid', () => {
		it('returns false when subject is empty', () => {
			const issue = new Issue(1, { subject: '', description: 'Test description', authorName: 'Author', link: '' });
			expect(issue.isValid()).toBe(false);
		});

		it('returns false when description is empty', () => {
			const issue = new Issue(1, { subject: 'Test subject', description: '', authorName: 'Author', link: '' });
			expect(issue.isValid()).toBe(false);
		});

		it('returns false when both subject and description are empty', () => {
			const issue = new Issue(1, { subject: '', description: '', authorName: 'Author', link: '' });
			expect(issue.isValid()).toBe(false);
		});

		it('returns true when both subject and description are non-empty', () => {
			const issue = new Issue(1, { subject: 'Test subject', description: 'Test description', authorName: 'Author', link: '' });
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
