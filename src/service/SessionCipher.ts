export type Session = {
	displayName: string;
	expiredAt: number;
};

export class SessionCipher {
	constructor(private readonly key: string) {}

	async encrypt(session: Session): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(JSON.stringify(session));
		const iv = crypto.getRandomValues(new Uint8Array(16)); // CBC 需要 16 位元組的 IV
		const key = await crypto.subtle.importKey(
			'raw', 
			encoder.encode(this.key), 
			{ name: 'AES-CBC' }, 
			false, 
			['encrypt']
		);
		const cipherText = await crypto.subtle.encrypt(
			{
				name: 'AES-CBC',
				iv,
			},
			key,
			data,
		);
		
		// 將 IV 與加密資料合併，以便解密時使用
		const result = new Uint8Array(iv.length + cipherText.byteLength);
		result.set(iv, 0);
		result.set(new Uint8Array(cipherText), iv.length);
		
		return btoa(String.fromCharCode(...result));
	}

	async decrypt(cipherText: string): Promise<Session | null> {
		try {
			const decoder = new TextDecoder();
			const data = Uint8Array.from(atob(cipherText), (c) => c.charCodeAt(0));
			const iv = data.slice(0, 16); // 取出前 16 位元組作為 IV
			const cipherData = data.slice(16); // 剩餘部分為加密資料
			
			const key = await crypto.subtle.importKey(
				'raw', 
				new TextEncoder().encode(this.key), 
				{ name: 'AES-CBC' }, 
				false, 
				['decrypt']
			);
			
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
			console.error('解密失敗:', e);
			return null;
		}
	}
}
