import { env } from 'cloudflare:workers';
import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';

import { SessionCookieName } from '@/constant';
import { SessionCipher } from '@/service/SessionCipher';
import { DiscordRoleAccessService } from '@/service/DiscordRoleAccessService';
import { discordAuth } from '@hono/oauth-providers/discord';

type DiscordGuideMember = {
	roles: string[];
};

const allowGuildId = '1245197991191642262';
const allowGuildRoleId = '1367854918874173576';

const route = new Hono().get(
	'/discord',
	discordAuth({
		client_id: env.DISCORD_CLIENT_ID,
		client_secret: env.DISCORD_CLIENT_SECRET,
		scope: ['identify', 'guilds.members.read'],
	}),
	async (c) => {
		const user = c.get('user-discord');
		const token = c.get('token');
		const displayName = user?.global_name || user?.username || user?.id || 'Anonymous';

		// 驗證用戶是否在指定公會中擁有有效角色
		const roleAccessService = new DiscordRoleAccessService(allowGuildId, allowGuildRoleId);
		const hasValidRole = await roleAccessService.isAllowed(token?.token, user?.id);

		if (!hasValidRole) {
			return c.text('You do not have permission to access this resource.', 403);
		}

		const expiredAt = new Date().getTime() + 24 * 60 * 60 * 1000;

		const cipher = new SessionCipher(env.SECRET_KEY_BASE);
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
