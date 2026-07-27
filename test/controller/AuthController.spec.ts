import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

describe('AuthController', () => {
	it('redirects to Discord OAuth when accessing /auth/discord', async () => {
		const response = await exports.default.fetch('https://example.com/auth/discord', {
			redirect: 'manual',
		});

		expect(response.status).toBe(302);
		const location = response.headers.get('Location');
		expect(location).toContain('discord.com');
		expect(location).toContain('oauth2');
	});
});
