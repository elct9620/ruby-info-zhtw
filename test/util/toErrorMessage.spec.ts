import { describe, expect, it } from 'vitest';
import { toErrorMessage } from '@/util/toErrorMessage';

describe('toErrorMessage', () => {
	it('returns message from Error instance', () => {
		expect(toErrorMessage(new Error('something broke'))).toBe('something broke');
	});

	it('returns string representation of non-Error values', () => {
		expect(toErrorMessage('plain string')).toBe('plain string');
		expect(toErrorMessage(42)).toBe('42');
		expect(toErrorMessage(null)).toBe('null');
		expect(toErrorMessage(undefined)).toBe('undefined');
	});

	it('returns message from Error subclass', () => {
		expect(toErrorMessage(new TypeError('type error'))).toBe('type error');
	});
});
