import { describe, expect, it } from 'vitest';
import { Journal } from '@/entity/Journal';

describe('Journal', () => {
	describe('constructor', () => {
		it('creates a journal with the given id', () => {
			const journal = new Journal(123, 'Alice', 'Some notes');
			expect(journal.id).toBe(123);
		});

		it('stores userName and notes', () => {
			const journal = new Journal(1, 'Alice', 'This is a note');
			expect(journal.userName).toBe('Alice');
			expect(journal.notes).toBe('This is a note');
		});
	});

	describe('isValid', () => {
		it('returns false when userName is empty', () => {
			const journal = new Journal(1, '', 'Some notes');
			expect(journal.isValid()).toBe(false);
		});

		it('returns false when notes is empty', () => {
			const journal = new Journal(1, 'Alice', '');
			expect(journal.isValid()).toBe(false);
		});

		it('returns false when both userName and notes are empty', () => {
			const journal = new Journal(1, '', '');
			expect(journal.isValid()).toBe(false);
		});

		it('returns true when both userName and notes are non-empty', () => {
			const journal = new Journal(1, 'Alice', 'This is a note');
			expect(journal.isValid()).toBe(true);
		});
	});
});
