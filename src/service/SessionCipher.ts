import { Logger } from './Logger';

const logger = new Logger('SessionCipher');

export type Session = {
	displayName: string;
	expiredAt: number;
};

export class SessionCipher {
	constructor(private readonly key: string) {}

	get keyData() {
		return new TextEncoder().encode(this.key);
	}

	private importKey(operations: ('encrypt' | 'decrypt')[]): Promise<CryptoKey> {
		return crypto.subtle.importKey('raw', this.keyData, { name: 'AES-CBC' }, false, operations);
	}

	async encrypt(session: Session): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(JSON.stringify(session));
		const iv = crypto.getRandomValues(new Uint8Array(16));
		const key = await this.importKey(['encrypt']);
		const cipherText = await crypto.subtle.encrypt(
			{
				name: 'AES-CBC',
				iv,
			},
			key,
			data,
		);

		const result = new Uint8Array(iv.length + cipherText.byteLength);
		result.set(iv, 0);
		result.set(new Uint8Array(cipherText), iv.length);

		return btoa(String.fromCharCode(...result));
	}

	async decrypt(cipherText: string): Promise<Session | null> {
		try {
			const decoder = new TextDecoder();
			const data = new Uint8Array(
				atob(cipherText)
					.split('')
					.map((c) => c.charCodeAt(0)),
			);
			const iv = data.slice(0, 16);
			const cipherData = data.slice(16);

			const key = await this.importKey(['decrypt']);
			const decryptedData = await crypto.subtle.decrypt(
				{
					name: 'AES-CBC',
					iv,
				},
				key,
				cipherData,
			);

			return JSON.parse(decoder.decode(decryptedData));
		} catch (e) {
			logger.error('Failed to decrypt session', { error: e instanceof Error ? e.message : 'Unknown error' });
			return null;
		}
	}
}
