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
	async execute(raw: ArrayBuffer): Promise<EmailRoute> {
		// TODO: Parse the email using PostalMime
		// TODO: Validate sender domain is in allowed origins
		// TODO: Check if the email body contains a valid issue link
		// TODO: Extract issueId as params

		return {
			type: EmailDispatchType.Reject,
			text: '',
		};
	}
}
