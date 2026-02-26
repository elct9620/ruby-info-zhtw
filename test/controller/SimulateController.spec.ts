import { SELF, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import { SessionCookieName } from '@/constant';
import { SessionCipher } from '@/service/SessionCipher';

describe('SimulateController', () => {
	it('returns 401 when no session cookie is present', async () => {
		const response = await SELF.fetch('https://example.com/simulate');

		expect(response.status).toBe(401);
		expect(await response.text()).toBe('Unauthorized');
	});

	it('returns 401 when session cookie is invalid', async () => {
		const response = await SELF.fetch('https://example.com/simulate', {
			headers: {
				Cookie: `${SessionCookieName}=invalid-cookie-value`,
			},
		});

		expect(response.status).toBe(401);
		expect(await response.text()).toBe('Unauthorized');
	});

	it('returns 200 with greeting when session is valid', async () => {
		const cipher = new SessionCipher(env.SECRET_KEY_BASE);
		const session = await cipher.encrypt({
			displayName: 'TestUser',
			expiredAt: Date.now() + 86400000,
		});

		const response = await SELF.fetch('https://example.com/simulate', {
			headers: {
				Cookie: `${SessionCookieName}=${session}`,
			},
		});

		expect(response.status).toBe(200);
		expect(await response.text()).toContain('TestUser');
	});
});
