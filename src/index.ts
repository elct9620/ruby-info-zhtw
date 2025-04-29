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

		// TODO: Parse the body to extract the issue number
		const issueLink = undefined;
		const issue = (await (await fetch(`${issueLink}.json?include=journals`)).json()) as Issue;

		console.debug(`Subject: ${issue.subject}`);
		console.debug(`Description: ${issue.description}`);
	},
} satisfies ExportedHandler<Env>;
