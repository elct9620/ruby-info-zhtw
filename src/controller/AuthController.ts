import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';

import config from '@/config';
import { SessionCookieName, SessionDurationMs } from '@/constant';
import { DiscordRoleAccessService } from '@/service/DiscordRoleAccessService';
import { SessionCipher } from '@/service/SessionCipher';
import { discordAuth } from '@hono/oauth-providers/discord';

const route = new Hono().get(
	'/discord',
	discordAuth({
		client_id: config.discordClientId,
		client_secret: config.discordClientSecret,
		scope: ['identify', 'guilds.members.read'],
	}),
	async (c) => {
		const user = c.get('user-discord');
		const token = c.get('token');
		const displayName = user?.global_name || user?.username || user?.id || 'Anonymous';

		const roleAccessService = new DiscordRoleAccessService(config.discordAllowGuildId, config.discordAllowRoleId);
		const hasValidRole = await roleAccessService.isAllowed(token?.token, user?.id);

		if (!hasValidRole) {
			return c.text('You do not have permission to access this resource.', 403);
		}

		const expiredAt = new Date().getTime() + SessionDurationMs;

		const cipher = new SessionCipher(config.secretKeyBase);
		const session = await cipher.encrypt({ displayName, expiredAt });

		setCookie(c, SessionCookieName, session, {
			httpOnly: true,
			sameSite: 'Lax',
			secure: true,
		});

		return c.redirect('/simulate', 302);
	},
);

export default route;
