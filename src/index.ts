import { Hono } from 'hono';

import AuthRoute from '@/controller/AuthController';
import SimulateRoute from '@/controller/SimulateController';
import { EmailDispatcher, EmailDispatchType } from '@/service/EmailDispatcher';
import { Logger } from '@/service/Logger';
import config from './config';

const logger = new Logger('EmailHandler');

const app = new Hono();

app.get('/', (c) => c.text('Ruby Information Bot'));
app.route('/auth', AuthRoute);
app.route('/simulate', SimulateRoute);

export default {
	fetch: app.fetch,
	async email(message, env, ctx) {
		const dispatcher = new EmailDispatcher(config.adminEmail);

		const rawEmail = new Response(message.raw);
		const route = await dispatcher.execute(await rawEmail.arrayBuffer());

		switch (route.type) {
			case EmailDispatchType.Summarize: {
				const { issueId } = route.params;
				const id = env.ISSUE_DEBOUNCE.idFromName(`issue-${issueId}`);
				const stub = env.ISSUE_DEBOUNCE.get(id);
				await stub.handleEmail(issueId);
				break;
			}

			case EmailDispatchType.ForwardAdmin:
				logger.info('Forwarding email to admin', { reason: route.text });
				await message.forward(route.params.adminEmail);
				break;

			case EmailDispatchType.Reject:
				logger.info('Rejecting email', { reason: route.text });
				message.setReject(route.text);
				break;
		}
	},
} satisfies ExportedHandler<Env>;

export { IssueDebounceObject } from '@/durable/IssueDebounceObject';
