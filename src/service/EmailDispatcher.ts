import * as PostalMime from 'postal-mime';

export enum EmailDispatchType {
	Summarize = 'summarize',
	ForwardAdmin = 'forward_admin',
	Reject = 'reject',
}

export type EmailRoute = {
	type: EmailDispatchType;
	text: string;
	params?: Record<string, any>;
};

export class EmailDispatcher {
	private readonly ALLOWED_ORIGINS = ['frost.tw', 'aotoki.me', 'nue.mailmanlists.eu', 'ml.ruby-lang.org'];

	constructor(private readonly adminEmail: string) {}

	async execute(raw: ArrayBuffer): Promise<EmailRoute> {
		// Parse the email using PostalMime
		const parser = new PostalMime.default();
		const parsedEmail = await parser.parse(raw);
		const body = parsedEmail.text;

		// Validate sender domain is in allowed origins
		const from = parsedEmail.from?.value[0]?.address || '';
		const senderDomain = from.split('@')[1]?.toLowerCase();

		if (!senderDomain || !this.ALLOWED_ORIGINS.some((domain) => senderDomain.endsWith(domain))) {
			console.error(`Unauthorized sender domain: ${senderDomain}`);
			return {
				type: EmailDispatchType.ForwardAdmin,
				text: `Unauthorized sender domain: ${senderDomain}`,
				params: { adminEmail: this.adminEmail }
			};
		}

		// Check if the email body contains a valid issue link
		const issueLinkMatch = body?.match(/https:\/\/bugs\.ruby-lang\.org\/issues\/(\d+)/);
		const issueLink = issueLinkMatch ? issueLinkMatch[0] : undefined;
		
		if (!issueLink) {
			console.error('No issue link found in the email body.');
			return {
				type: EmailDispatchType.ForwardAdmin,
				text: 'No issue link found in the email body.',
				params: { adminEmail: this.adminEmail }
			};
		}

		// Extract issueId as params
		const match = issueLink.match(/https:\/\/bugs\.ruby-lang\.org\/issues\/(\d+)/);
		const issueId = match ? parseInt(match[1], 10) : null;
		
		if (!issueId) {
			console.error('Failed to extract issue ID from the link.');
			return {
				type: EmailDispatchType.Reject,
				text: 'Failed to extract issue ID from the link.'
			};
		}

		// Return summarize route with issueId
		return {
			type: EmailDispatchType.Summarize,
			text: `Processing Ruby issue #${issueId}`,
			params: { 
				issueId,
				issueLink
			}
		};
	}
}
