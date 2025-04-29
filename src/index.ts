import * as PostalMime from 'postal-mime';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		return new Response('Hello World!');
	},
	async email(message, env, ctx) {
		const parser = new PostalMime.default();
		const rawEmail = new Response(message.raw);
		const parsedEmail = await parser.parse(await rawEmail.arrayBuffer());

		console.debug(`Parsed: ${parsedEmail.text}`);
	},
} satisfies ExportedHandler<Env>;
