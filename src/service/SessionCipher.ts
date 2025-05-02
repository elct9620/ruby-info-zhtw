export type Session = {
	displayName: string;
	expiredAt: number;
};

export class SessionCipher {
	constructor(private readonly key: string) {}
	
	private decodeBase64(base64String: string): Uint8Array {
		return Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));
	}

	async encrypt(session: Session): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(JSON.stringify(session));
		const iv = crypto.getRandomValues(new Uint8Array(16));
		const keyData = this.decodeBase64(this.key);
		const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-CBC' }, false, ['encrypt']);
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
			const data = this.decodeBase64(cipherText);
			const iv = data.slice(0, 16);
			const cipherData = data.slice(16);

			const keyData = this.decodeBase64(this.key);
			const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-CBC' }, false, ['decrypt']);

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
			return null;
		}
	}
}
