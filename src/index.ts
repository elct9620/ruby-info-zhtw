import { createOpenAI } from '@ai-sdk/openai';
import { Hono } from 'hono';

import AuthRoute from '@/controller/AuthController';
import SimulateRoute from '@/controller/SimulateController';
import { DiscordSummarizePresenter } from '@/presenter/DiscordSummarizePresenter';
import { RestIssueRepository } from '@/repository/RestIssueRepository';
import { SpanTrackedIssueRepository } from '@/repository/SpanTrackedIssueRepository';
import { AiSummarizeService } from '@/service/AiSummarizeService';
import { EmailDispatcher, EmailDispatchType } from '@/service/EmailDispatcher';
import { LangfuseService } from '@/service/LangfuseService';
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
			case EmailDispatchType.Summarize: {
				const { issueId } = route.params;

				const langfuseService =
					config.langfusePublicKey && config.langfuseSecretKey
						? new LangfuseService(
								config.langfusePublicKey,
								config.langfuseSecretKey,
								config.langfuseBaseUrl
							)
						: undefined;

				const traceId = crypto.randomUUID();
				try {
					await langfuseService?.createTrace({
						id: traceId,
						name: 'email-summarize',
						input: { issueId },
						tags: ['summarize'],
					});
				} catch (error) {
					console.error('Failed to create Langfuse trace:', error);
				}

				try {
					const repository = new RestIssueRepository();
					const summarizeService = new AiSummarizeService(openai('gpt-5-mini'), langfuseService);
					if (langfuseService) {
						summarizeService.setTraceId(traceId);
					}
					const presenter = new DiscordSummarizePresenter();

					const trackedRepository = langfuseService
						? new SpanTrackedIssueRepository(repository, langfuseService, traceId)
						: repository;

					const useCase = new SummarizeUsecase(trackedRepository, summarizeService, presenter);
					await useCase.execute(issueId);

					const renderStart = new Date();
					const renderSuccess = await presenter.render(config.discordWebhook);
					const renderEnd = new Date();
					try {
						await langfuseService?.createSpan({
							id: crypto.randomUUID(),
							traceId,
							name: 'discord-webhook',
							startTime: renderStart,
							endTime: renderEnd,
							input: { webhookUrl: '[redacted]' },
							output: { success: renderSuccess },
						});
					} catch (error) {
						console.error('Failed to create discord-webhook span:', error);
					}

					try {
						await langfuseService?.finalizeTrace({
							traceId,
							output: { success: true },
						});
					} catch (error) {
						console.error('Failed to finalize Langfuse trace:', error);
					}
				} catch (error) {
					console.error(`Error processing issue:`, error);
					try {
						await langfuseService?.finalizeTrace({
							traceId,
							output: {
								success: false,
								error: error instanceof Error ? error.message : String(error),
							},
						});
					} catch (traceError) {
						console.error('Failed to finalize Langfuse trace:', traceError);
					}
				}
				break;
			}

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
