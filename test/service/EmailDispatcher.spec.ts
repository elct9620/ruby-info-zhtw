import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EmailDispatcher, EmailDispatchType } from '@/service/EmailDispatcher';
import { Logger } from '@/service/Logger';

function createMockEmail(from: string, body: string): ArrayBuffer {
	const email = `From: ${from}
To: core@ruby.aotoki.cloud
Subject: Test Email
Content-Type: text/plain; charset="UTF-8"

${body}`;
	const encoded = new TextEncoder().encode(email);
	const buffer = new ArrayBuffer(encoded.byteLength);
	new Uint8Array(buffer).set(encoded);
	return buffer;
}

describe('EmailDispatcher', () => {
	const adminEmail = 'admin@example.com';
	let logger: Logger;

	beforeEach(() => {
		logger = new Logger('EmailDispatcher');
		vi.spyOn(logger, 'warn').mockImplementation(() => {});
	});

	describe('execute', () => {
		describe('sender domain validation', () => {
			it('accepts email from frost.tw domain', async () => {
				const dispatcher = new EmailDispatcher(adminEmail, logger);
				const raw = createMockEmail('user@frost.tw', 'https://bugs.ruby-lang.org/issues/12345');

				const result = await dispatcher.execute(raw);

				expect(result.type).toBe(EmailDispatchType.Summarize);
			});

			it('accepts email from aotoki.me domain', async () => {
				const dispatcher = new EmailDispatcher(adminEmail, logger);
				const raw = createMockEmail('user@aotoki.me', 'https://bugs.ruby-lang.org/issues/12345');

				const result = await dispatcher.execute(raw);

				expect(result.type).toBe(EmailDispatchType.Summarize);
			});

			it('accepts email from nue.mailmanlists.eu domain', async () => {
				const dispatcher = new EmailDispatcher(adminEmail, logger);
				const raw = createMockEmail('user@nue.mailmanlists.eu', 'https://bugs.ruby-lang.org/issues/12345');

				const result = await dispatcher.execute(raw);

				expect(result.type).toBe(EmailDispatchType.Summarize);
			});

			it('accepts email from ml.ruby-lang.org domain', async () => {
				const dispatcher = new EmailDispatcher(adminEmail, logger);
				const raw = createMockEmail('user@ml.ruby-lang.org', 'https://bugs.ruby-lang.org/issues/12345');

				const result = await dispatcher.execute(raw);

				expect(result.type).toBe(EmailDispatchType.Summarize);
			});

			it('accepts email from subdomain of allowed domain', async () => {
				const dispatcher = new EmailDispatcher(adminEmail, logger);
				const raw = createMockEmail('user@sub.frost.tw', 'https://bugs.ruby-lang.org/issues/12345');

				const result = await dispatcher.execute(raw);

				expect(result.type).toBe(EmailDispatchType.Summarize);
			});

			it('rejects email from unauthorized domain', async () => {
				const dispatcher = new EmailDispatcher(adminEmail, logger);
				const raw = createMockEmail('user@malicious.com', 'https://bugs.ruby-lang.org/issues/12345');

				const result = await dispatcher.execute(raw);

				expect(result.type).toBe(EmailDispatchType.ForwardAdmin);
				expect(result.text).toContain('Unauthorized sender domain');
				if (result.type === EmailDispatchType.ForwardAdmin) {
					expect(result.params.adminEmail).toBe(adminEmail);
				}
			});
		});

		describe('issue link extraction', () => {
			it('extracts issue ID from valid Ruby bug tracker link', async () => {
				const dispatcher = new EmailDispatcher(adminEmail, logger);
				const raw = createMockEmail('user@frost.tw', 'Check this issue: https://bugs.ruby-lang.org/issues/12345');

				const result = await dispatcher.execute(raw);

				expect(result.type).toBe(EmailDispatchType.Summarize);
				if (result.type === EmailDispatchType.Summarize) {
					expect(result.params.issueId).toBe(12345);
				}
			});

			it('forwards to admin when no issue link found', async () => {
				const dispatcher = new EmailDispatcher(adminEmail, logger);
				const raw = createMockEmail('user@frost.tw', 'This email has no issue link');

				const result = await dispatcher.execute(raw);

				expect(result.type).toBe(EmailDispatchType.ForwardAdmin);
				expect(result.text).toContain('No issue link found');
				if (result.type === EmailDispatchType.ForwardAdmin) {
					expect(result.params.adminEmail).toBe(adminEmail);
				}
			});

			it('extracts first issue link when multiple links present', async () => {
				const dispatcher = new EmailDispatcher(adminEmail, logger);
				const raw = createMockEmail(
					'user@frost.tw',
					'First: https://bugs.ruby-lang.org/issues/111 Second: https://bugs.ruby-lang.org/issues/222'
				);

				const result = await dispatcher.execute(raw);

				expect(result.type).toBe(EmailDispatchType.Summarize);
				if (result.type === EmailDispatchType.Summarize) {
					expect(result.params.issueId).toBe(111);
				}
			});

			it('returns correct message text for summarize route', async () => {
				const dispatcher = new EmailDispatcher(adminEmail, logger);
				const raw = createMockEmail('user@frost.tw', 'https://bugs.ruby-lang.org/issues/99999');

				const result = await dispatcher.execute(raw);

				expect(result.type).toBe(EmailDispatchType.Summarize);
				expect(result.text).toBe('Processing Ruby issue #99999');
			});
		});
	});
});
