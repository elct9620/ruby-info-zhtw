import { discordAuth } from '@hono/oauth-providers/discord';
import { env } from 'cloudflare:workers';
import { Hono } from 'hono';

const route = new Hono().get(
	'/discord',
	discordAuth({
		client_id: env.DISCORD_CLIENT_ID,
		client_secret: env.DISCORD_CLIENT_SECRET,
		scope: ['identify', 'guilds.members.read'],
	}),
	(c) => {
		const user = c.get('user-discord');
		return c.json(user);
	},
);

export default route;
