import { createOpenAI } from '@ai-sdk/openai';
import { Hono } from 'hono';

import AuthRoute from '@/controller/AuthController';
import SimulateRoute from '@/controller/SimulateController';
import { DiscordSummarizePresenter } from '@/presenter/DiscordSummarizePresenter';
import { RestIssueRepository } from '@/repository/RestIssueRepository';
import { AiSummarizeService } from '@/service/AiSummarizeService';
import { EmailDispatcher, EmailDispatchType } from '@/service/EmailDispatcher';
import { SummarizeUsecase } from '@/usecase/SummarizeUsecase';
import config from './config';

const openai = createOpenAI({
	baseURL: config.openAiGateway,
	apiKey: config.openAiApiKey,
});

const app = new Hono();

app.get('/', (c) => c.text('Ruby Information Bot'));
app.route('/auth', AuthRoute);
app.route('/simulate', SimulateRoute);

export default {
	fetch: app.fetch,
	async email(message, env, ctx) {
		// Create email dispatcher
		const dispatcher = new EmailDispatcher(config.adminEmail);

		// Process the email
		const rawEmail = new Response(message.raw);
		const route = await dispatcher.execute(await rawEmail.arrayBuffer());

		// Handle the route
		switch (route.type) {
			case EmailDispatchType.Summarize:
				try {
					const { issueId } = route.params;

					// Create dependencies
					const repository = new RestIssueRepository();
					const summarizeService = new AiSummarizeService(openai('gpt-4.1-mini'));
					const presenter = new DiscordSummarizePresenter();

					// Create and execute the use case
					const useCase = new SummarizeUsecase(repository, summarizeService, presenter);
					await useCase.execute(issueId);

					// Render the result to Discord
					await presenter.render(config.discordWebhook);
				} catch (error) {
					console.error(`Error processing issue:`, error);
				}
				break;

			case EmailDispatchType.ForwardAdmin:
				console.log(`Forwarding email to admin: ${route.text}`);
				await message.forward(route.params.adminEmail);
				break;

			case EmailDispatchType.Reject:
				console.log(`Rejecting email: ${route.text}`);
				message.setReject(route.text);
				break;
		}
	},
} satisfies ExportedHandler<Env>;
