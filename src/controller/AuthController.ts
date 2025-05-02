import { env } from 'cloudflare:workers';
import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';

import { SessionCookieName } from '@/constant';
import { SessionCipher } from '@/service/SessionCipher';
import { discordAuth } from '@hono/oauth-providers/discord';

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
		const hasValidRole = await verifyGuildMemberRole(token, user?.id);
		
		if (!hasValidRole) {
			return c.text('您沒有訪問權限。請確保您是指定 Discord 伺服器的成員並擁有必要的角色。', 403);
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

/**
 * 驗證用戶是否在指定公會中擁有有效角色
 * @param token Discord OAuth 訪問令牌
 * @param userId Discord 用戶 ID
 * @returns 如果用戶在公會中並擁有有效角色，則返回 true
 */
async function verifyGuildMemberRole(token: string, userId?: string): Promise<boolean> {
	if (!userId || !token) return false;
	
	try {
		// 首先獲取用戶所屬的公會列表
		const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		});
		
		if (!guildsResponse.ok) {
			console.error('無法獲取用戶公會列表:', await guildsResponse.text());
			return false;
		}
		
		const guilds = await guildsResponse.json();
		
		// 檢查用戶是否在目標公會中
		const isInGuild = guilds.some((guild: any) => guild.id === allowGuildId);
		if (!isInGuild) {
			console.error('用戶不在指定公會中');
			return false;
		}
		
		// 獲取用戶在指定公會中的角色
		const memberResponse = await fetch(`https://discord.com/api/v10/users/@me/guilds/${allowGuildId}/member`, {
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		});
		
		if (!memberResponse.ok) {
			console.error('無法獲取用戶在公會中的角色:', await memberResponse.text());
			return false;
		}
		
		const memberData = await memberResponse.json();
		
		// 檢查用戶是否擁有指定角色
		return memberData.roles.includes(allowGuildRoleId);
	} catch (error) {
		console.error('驗證 Discord 角色時出錯:', error);
		return false;
	}
}

export default route;
