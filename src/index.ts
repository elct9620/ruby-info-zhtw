import { createOpenAI } from '@ai-sdk/openai';
import { env } from 'cloudflare:workers';
import * as PostalMime from 'postal-mime';
import { DiscordSummarizePresenter } from './presenter/DiscordSummarizePresenter';
import { RestIssueRepository } from './repository/RestIssueRepository';
import { AiSummarizeService } from './service/AiSummarizeService';
import { SummarizeUsecase } from './usecase/SummarizeUsecase';

const openai = createOpenAI({
	baseURL: env.CF_AI_GATEWAY ? `${env.CF_AI_GATEWAY}openai` : undefined,
	apiKey: env.OPENAI_API_KEY,
});

const ALLOWED_ORIGINS = ['frost.tw', 'aotoki.me', 'nue.mailmanlists.eu', 'ml.ruby-lang.org'];

export default {
	async fetch(request, env, ctx): Promise<Response> {
		return new Response('Hello World!');
	},
	async email(message, env, ctx) {
		const parser = new PostalMime.default();
		const rawEmail = new Response(message.raw);
		const parsedEmail = await parser.parse(await rawEmail.arrayBuffer());
		const body = parsedEmail.text;

		// Validate sender domain is in allowed origins
		const from = parsedEmail.from.address || '';
		const senderDomain = from.split('@')[1]?.toLowerCase();

		if (!senderDomain || !ALLOWED_ORIGINS.some((domain) => senderDomain.endsWith(domain))) {
			console.error(`Unauthorized sender domain: ${senderDomain}`);
			message.setReject('Unauthorized sender domain');
			return;
		}

		const issueLinkMatch = body?.match(/https:\/\/bugs\.ruby-lang\.org\/issues\/(\d+)/);
		const issueLink = issueLinkMatch ? issueLinkMatch[0] : undefined;
		if (!issueLink) {
			console.error('No issue link found in the email body.');
			await message.forward(env.ADMIN_EMAIL);
			return;
		}

		// Extract issue ID from the link
		const match = issueLink.match(/https:\/\/bugs\.ruby-lang\.org\/issues\/(\d+)/);
		const issueId = match ? parseInt(match[1], 10) : null;
		if (!issueId) {
			console.error('Failed to extract issue ID from the link.');
			return;
		}

		try {
			// Create dependencies
			const repository = new RestIssueRepository();
			const summarizeService = new AiSummarizeService(openai('gpt-4.1-mini'));
			const presenter = new DiscordSummarizePresenter();
			
			// Create and execute the use case
			const useCase = new SummarizeUsecase(repository, summarizeService, presenter);
			await useCase.execute(issueId);
			
			// Render the result to Discord
			await presenter.render(env.DISCORD_WEBHOOK);
		} catch (error) {
			console.error(`Error processing issue ${issueId}:`, error);
		}
	},
} satisfies ExportedHandler<Env>;
