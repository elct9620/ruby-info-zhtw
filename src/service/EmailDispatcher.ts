import * as PostalMime from 'postal-mime';

export enum EmailDispatchType {
	Summarize = 'summarize',
	ForwardAdmin = 'forward_admin',
	Reject = 'reject',
}

export type EmailRoute =
	| {
			type: EmailDispatchType.Summarize;
			text: string;
			params: { issueId: number };
	  }
	| {
			type: EmailDispatchType.ForwardAdmin;
			text: string;
			params: { adminEmail: string };
	  }
	| {
			type: EmailDispatchType.Reject;
			text: string;
	  };

const ISSUE_LINK_PATTERN = /https:\/\/bugs\.ruby-lang\.org\/issues\/(\d+)/;

export class EmailDispatcher {
	private readonly ALLOWED_ORIGINS = ['frost.tw', 'aotoki.me', 'nue.mailmanlists.eu', 'ml.ruby-lang.org'];

	constructor(private readonly adminEmail: string) {}

	async execute(raw: ArrayBuffer): Promise<EmailRoute> {
		const parser = new PostalMime.default();
		const parsedEmail = await parser.parse(raw);

		const from = parsedEmail.from?.address || '';
		const senderDomain = from.split('@')[1]?.toLowerCase();

		if (!this.isAllowedSenderDomain(senderDomain)) {
			console.error(`Unauthorized sender domain: ${senderDomain}`);
			return {
				type: EmailDispatchType.ForwardAdmin,
				text: `Unauthorized sender domain: ${senderDomain}`,
				params: { adminEmail: this.adminEmail },
			};
		}

		const issueId = this.extractIssueId(parsedEmail.text);

		if (issueId === null) {
			console.error('No issue link found in the email body.');
			return {
				type: EmailDispatchType.ForwardAdmin,
				text: 'No issue link found in the email body.',
				params: { adminEmail: this.adminEmail },
			};
		}

		return {
			type: EmailDispatchType.Summarize,
			text: `Processing Ruby issue #${issueId}`,
			params: {
				issueId,
			},
		};
	}

	private isAllowedSenderDomain(domain: string | undefined): boolean {
		if (!domain) return false;
		return this.ALLOWED_ORIGINS.some((allowed) => domain.endsWith(allowed));
	}

	private extractIssueId(body: string | undefined): number | null {
		const match = body?.match(ISSUE_LINK_PATTERN);
		return match ? parseInt(match[1], 10) : null;
	}
}
