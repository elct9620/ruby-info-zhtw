export type Session = {
	displayName: string;
	expiredAt: number;
};

export class SessionCipher {
	constructor(private readonly key: string) {}

	async encrypt(session: Session): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(JSON.stringify(session));
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const key = await crypto.subtle.importKey('raw', encoder.encode(this.key), { name: 'AES-GCM' }, false, ['encrypt']);
		const cipherText = await crypto.subtle.encrypt(
			{
				name: 'AES-GCM',
				iv,
			},
			key,
			data,
		);
		return btoa(String.fromCharCode(...new Uint8Array(cipherText)));
	}

	async decrypt(cipherText: string): Promise<Session | null> {
		const decoder = new TextDecoder();
		const data = Uint8Array.from(atob(cipherText), (c) => c.charCodeAt(0));
		const iv = data.slice(0, 12);
		const cipherData = data.slice(12);
		const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(this.key), { name: 'AES-GCM' }, false, ['decrypt']);
		try {
			const decryptedData = await crypto.subtle.decrypt(
				{
					name: 'AES-GCM',
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
