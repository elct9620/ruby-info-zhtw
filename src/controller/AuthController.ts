import { SessionCookieName } from '@/constant';
import { SessionCipher } from '@/service/SessionCipher';
import { discordAuth } from '@hono/oauth-providers/discord';
import { env } from 'cloudflare:workers';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';

const route = new Hono().get(
	'/discord',
	discordAuth({
		client_id: env.DISCORD_CLIENT_ID,
		client_secret: env.DISCORD_CLIENT_SECRET,
		scope: ['identify', 'guilds.members.read'],
	}),
	async (c) => {
		const cipher = new SessionCipher(env.SECRET_KEY_BASE);

		const sessionCookie = getCookie(c, SessionCookieName);
		if (sessionCookie) {
			const session = await cipher.decrypt(sessionCookie);
			if (session) {
				return c.json(session);
			}
		}

		const user = c.get('user-discord');

		const displayName = user?.global_name || user?.username || user?.id || 'Anonymous';
		const expiredAt = new Date().getTime() + 24 * 60 * 60 * 1000;
		const session = await cipher.encrypt({ displayName, expiredAt });

		setCookie(c, SessionCookieName, session, {
			httpOnly: true,
			sameSite: 'Strict',
			secure: true,
		});

		return c.json(user);
	},
);

export default route;
