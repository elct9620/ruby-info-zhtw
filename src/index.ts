import * as PostalMime from 'postal-mime';

interface Issue {
	id: number;
	subject: string;
	description: string;
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

		const issue = (await (await fetch(`${issueLink}.json?include=journals`)).json()) as Issue;

		console.debug(`Subject: ${issue.subject}`);
		console.debug(`Description: ${issue.description}`);
	},
} satisfies ExportedHandler<Env>;
