import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { env } from 'cloudflare:workers';
import * as PostalMime from 'postal-mime';

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

interface Issue {
	id: number;
	subject: string;
	description: string;
}

/**
 * Sends the translated issue to Discord webhook
 */
async function sendToDiscord(
	webhookUrl: string,
	data: {
		issueId: number;
		subject: string;
		translatedText: string;
		originalLink: string;
	},
) {
	const { issueId, subject, translatedText, originalLink } = data;

	const payload = {
		embeds: [
			{
				title: `Ruby Issue #${issueId}: ${subject}`,
				description: translatedText.length > 4000 ? translatedText.substring(0, 4000) + '...(內容過長，已截斷)' : translatedText,
				color: 0xcc342d, // Ruby red color
				url: originalLink,
				footer: {
					text: '由 AI 自動翻譯 | 原始內容可能有所不同',
				},
				timestamp: new Date().toISOString(),
			},
		],
	};

	const response = await fetch(webhookUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		console.error(`Failed to send to Discord: ${response.status} ${response.statusText}`);
		console.error(await response.text());
	}

	return response.ok;
}

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

		console.log(`Fetching issue from ${issueLink}.json?include=journals`);
		const { issue } = (await (await fetch(`${issueLink}.json?include=journals`)).json()) as { issue: Issue };

		const { text } = await generateText({
			model: openai('gpt-4.1-mini'),
			prompt: `${prompt}\n\n Subject: ${issue.subject}\n\nDescription:\n${issue.description}`,
		});

		console.debug(text);

		// Send the translated content to Discord
		await sendToDiscord(env.DISCORD_WEBHOOK, {
			issueId: issue.id,
			subject: issue.subject,
			translatedText: text,
			originalLink: issueLink,
		});
	},
} satisfies ExportedHandler<Env>;

interface Env {
	OPENAI_API_KEY: string;
	DISCORD_WEBHOOK: string;
}
