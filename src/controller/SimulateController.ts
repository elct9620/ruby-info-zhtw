import { env } from 'cloudflare:workers';
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';

import { Session, SessionCipher } from '@/service/SessionCipher';
import { createMiddleware } from 'hono/factory';

const authMiddleware = createMiddleware<{
	Variables: {
		session: Session;
	};
}>(async (c, next) => {
	const sessionCookie = getCookie(c, 'session');
	if (!sessionCookie) {
		return c.text('Unauthorized', 401);
	}

	const cipher = new SessionCipher(env.SECRET_KEY_BASE);
	const session = await cipher.decrypt(sessionCookie);
	if (!session) {
		return c.text('Unauthorized', 401);
	}

	c.set('session', session);

	await next();
});

const route = new Hono().use(authMiddleware).get('/simulate', async (c) => {
	return c.text(`Hello, ${c.get('session').displayName}, this feature is not implemented yet.`);
});

export default route;
