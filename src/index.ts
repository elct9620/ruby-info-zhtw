import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { env } from 'cloudflare:workers';
import * as PostalMime from 'postal-mime';
import { DiscordSummarizePresenter } from './presenter/DiscordSummarizePresenter';
import { RestIssueRepository } from './repository/RestIssueRepository';
import { Issue } from './entity/Issue';

const openai = createOpenAI({
	baseURL: env.CF_AI_GATEWAY ? `${env.CF_AI_GATEWAY}openai` : undefined,
	apiKey: env.OPENAI_API_KEY,
});

const prompt = `
Translate the following issue description into Traditional Chinese with following rules:

1. You MUST use Traditional Chinese (Taiwan) for all translations.
2. You MUST keep code blocks and formatting in the original format.
3. Use simple and clear language to explain the issue.
`;


export default {
	async fetch(request, env, ctx): Promise<Response> {
		return new Response('Hello World!');
	},
	async email(message, env, ctx) {
		const parser = new PostalMime.default();
		const rawEmail = new Response(message.raw);
		const parsedEmail = await parser.parse(await rawEmail.arrayBuffer());
		const body = parsedEmail.text;

		const issueLinkMatch = body?.match(/https:\/\/bugs\.ruby-lang\.org\/issues\/(\d+)/);
		const issueLink = issueLinkMatch ? issueLinkMatch[0] : undefined;
		if (!issueLink) {
			console.error('No issue link found in the email body.');
			return;
		}

		// Extract issue ID from the link
		const issueId = RestIssueRepository.extractIssueIdFromUrl(issueLink);
		if (!issueId) {
			console.error('Failed to extract issue ID from the link.');
			return;
		}

		// Fetch issue using the repository
		const repository = new RestIssueRepository();
		const issue = await repository.findById(issueId);
		if (!issue) {
			console.error(`Failed to fetch issue with ID: ${issueId}`);
			return;
		}

		const { text } = await generateText({
			model: openai('gpt-4.1-mini'),
			prompt: `${prompt}\n\n Subject: ${issue.subject}\n\nDescription:\n${issue.description}`,
		});

		console.debug(text);

		// Send the translated content to Discord using the presenter
		const presenter = new DiscordSummarizePresenter();
		presenter.setTitle(issue.subject);
		presenter.setDescription(text);
		presenter.setLink(issueLink);
		await presenter.render(env.DISCORD_WEBHOOK);
	},
} satisfies ExportedHandler<Env>;

interface Env {
	OPENAI_API_KEY: string;
	DISCORD_WEBHOOK: string;
}
