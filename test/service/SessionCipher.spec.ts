import { describe, expect, it } from 'vitest';
import { SessionCipher, Session } from '@/service/SessionCipher';

describe('SessionCipher', () => {
	const validKey = '0123456789abcdef0123456789abcdef';

	describe('encrypt and decrypt', () => {
		it('encrypts and decrypts a session correctly', async () => {
			const cipher = new SessionCipher(validKey);
			const session: Session = {
				displayName: 'Test User',
				expiredAt: Date.now() + 3600000,
			};

			const encrypted = await cipher.encrypt(session);
			const decrypted = await cipher.decrypt(encrypted);

			expect(decrypted).not.toBeNull();
			expect(decrypted?.displayName).toBe(session.displayName);
			expect(decrypted?.expiredAt).toBe(session.expiredAt);
		});

		it('produces different ciphertext for same session due to random IV', async () => {
			const cipher = new SessionCipher(validKey);
			const session: Session = {
				displayName: 'Test User',
				expiredAt: Date.now() + 3600000,
			};

			const encrypted1 = await cipher.encrypt(session);
			const encrypted2 = await cipher.encrypt(session);

			expect(encrypted1).not.toBe(encrypted2);
		});

		it('returns base64 encoded string from encrypt', async () => {
			const cipher = new SessionCipher(validKey);
			const session: Session = {
				displayName: 'Test User',
				expiredAt: Date.now() + 3600000,
			};

			const encrypted = await cipher.encrypt(session);

			expect(() => atob(encrypted)).not.toThrow();
		});
	});

	describe('decrypt', () => {
		it('returns null for invalid ciphertext', async () => {
			const cipher = new SessionCipher(validKey);

			const result = await cipher.decrypt('invalid-ciphertext');

			expect(result).toBeNull();
		});

		it('returns null for tampered ciphertext', async () => {
			const cipher = new SessionCipher(validKey);
			const session: Session = {
				displayName: 'Test User',
				expiredAt: Date.now() + 3600000,
			};

			const encrypted = await cipher.encrypt(session);
			const tampered = encrypted.slice(0, -10) + 'xxxxxxxxxx';

			const result = await cipher.decrypt(tampered);

			expect(result).toBeNull();
		});

		it('returns null when decrypting with different key', async () => {
			const cipher1 = new SessionCipher(validKey);
			const cipher2 = new SessionCipher('fedcba9876543210fedcba9876543210');
			const session: Session = {
				displayName: 'Test User',
				expiredAt: Date.now() + 3600000,
			};

			const encrypted = await cipher1.encrypt(session);
			const result = await cipher2.decrypt(encrypted);

			expect(result).toBeNull();
		});

		it('returns null for empty string', async () => {
			const cipher = new SessionCipher(validKey);

			const result = await cipher.decrypt('');

			expect(result).toBeNull();
		});
	});

	describe('keyData', () => {
		it('returns Uint8Array from key string', () => {
			const cipher = new SessionCipher(validKey);

			const keyData = cipher.keyData;

			expect(keyData).toBeInstanceOf(Uint8Array);
			expect(keyData.length).toBe(validKey.length);
		});
	});

	describe('session data integrity', () => {
		it('preserves special characters in displayName', async () => {
			const cipher = new SessionCipher(validKey);
			const session: Session = {
				displayName: '使用者名稱 🎉 Special <>&"\'',
				expiredAt: Date.now() + 3600000,
			};

			const encrypted = await cipher.encrypt(session);
			const decrypted = await cipher.decrypt(encrypted);

			expect(decrypted?.displayName).toBe(session.displayName);
		});

		it('preserves exact expiredAt timestamp', async () => {
			const cipher = new SessionCipher(validKey);
			const exactTimestamp = 1704067200000;
			const session: Session = {
				displayName: 'Test User',
				expiredAt: exactTimestamp,
			};

			const encrypted = await cipher.encrypt(session);
			const decrypted = await cipher.decrypt(encrypted);

			expect(decrypted?.expiredAt).toBe(exactTimestamp);
		});
	});
});
