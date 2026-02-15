import { env, runDurableObjectAlarm } from 'cloudflare:test';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const ISSUE_ID = 12345;

function mockBugTrackerResponse() {
	return {
		issue: {
			id: ISSUE_ID,
			tracker: { name: 'Feature' },
			subject: 'Test Subject',
			description: 'Test Description',
			author: { id: 1, name: 'Author' },
			journals: [],
		},
	};
}

function mockOpenAiResponse() {
	const body = JSON.stringify({
		id: 'chatcmpl-123',
		object: 'chat.completion',
		model: 'gpt-5-mini',
		choices: [{ index: 0, message: { content: 'AI Summary' }, finish_reason: 'stop' }],
		usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
	});
	return new Response(body, {
		status: 200,
		headers: { 'content-type': 'application/json' },
	});
}

function mockAllFetch() {
	return vi.fn().mockImplementation((url: string) => {
		if (typeof url === 'string' && url.includes('bugs.ruby-lang.org')) {
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve(mockBugTrackerResponse()),
			});
		}
		if (typeof url === 'string' && url.includes('openai.com')) {
			return Promise.resolve(mockOpenAiResponse());
		}
		return Promise.resolve({ ok: true });
	});
}

function createStub() {
	const id = env.ISSUE_DEBOUNCE.idFromName(`issue-${ISSUE_ID}`);
	return env.ISSUE_DEBOUNCE.get(id);
}

describe('IssueDebounceObject', () => {
	const originalFetch = global.fetch;
	let logSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		global.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	describe('handleEmail', () => {
		it('sets alarm that triggers summarize on first email', async () => {
			global.fetch = mockAllFetch();
			const stub = createStub();

			await stub.handleEmail(ISSUE_ID);
			await runDurableObjectAlarm(stub);

			const urls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
			expect(urls.some((u) => u.includes('bugs.ruby-lang.org'))).toBe(true);
		});

		it('logs debounce entry on first email', async () => {
			global.fetch = mockAllFetch();
			const stub = createStub();

			await stub.handleEmail(ISSUE_ID);

			expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({ level: 'info', message: `New debounce started for issue #${ISSUE_ID}`, component: 'IssueDebounceObject', issueId: ISSUE_ID }));
		});

		it('resets alarm on subsequent emails', async () => {
			global.fetch = mockAllFetch();
			const stub = createStub();

			await stub.handleEmail(ISSUE_ID);
			await stub.handleEmail(ISSUE_ID);
			await runDurableObjectAlarm(stub);

			const urls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
			expect(urls.some((u) => u.includes('bugs.ruby-lang.org'))).toBe(true);
		});

		it('logs timer reset on subsequent emails', async () => {
			global.fetch = mockAllFetch();
			const stub = createStub();

			await stub.handleEmail(ISSUE_ID);
			await stub.handleEmail(ISSUE_ID);

			expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({ level: 'info', message: `Debounce timer reset due to new email for issue #${ISSUE_ID}`, component: 'IssueDebounceObject', issueId: ISSUE_ID }));
		});
	});

	describe('alarm', () => {
		it('calls Bug Tracker API on alarm', async () => {
			global.fetch = mockAllFetch();
			const stub = createStub();

			await stub.handleEmail(ISSUE_ID);
			await runDurableObjectAlarm(stub);

			const urls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
			expect(urls.some((u) => u.includes(`bugs.ruby-lang.org/issues/${ISSUE_ID}`))).toBe(true);
		});

		it('clears state after successful alarm', async () => {
			global.fetch = mockAllFetch();
			const stub = createStub();

			await stub.handleEmail(ISSUE_ID);
			await runDurableObjectAlarm(stub);

			// Reset fetch mock to track new calls
			const newFetch = mockAllFetch();
			global.fetch = newFetch;

			// New email should start a fresh debounce cycle
			await stub.handleEmail(ISSUE_ID);
			await runDurableObjectAlarm(stub);

			const urls = newFetch.mock.calls.map((call: unknown[]) => String(call[0]));
			expect(urls.some((u: string) => u.includes('bugs.ruby-lang.org'))).toBe(true);
		});

		it('logs alarm fired with email count', async () => {
			global.fetch = mockAllFetch();
			const stub = createStub();

			await stub.handleEmail(ISSUE_ID);
			await stub.handleEmail(ISSUE_ID);
			await runDurableObjectAlarm(stub);

			expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({ level: 'info', message: `Debounce alarm triggered for issue #${ISSUE_ID} after 2 emails, starting summarization`, component: 'IssueDebounceObject', issueId: ISSUE_ID, emailCount: 2 }));
		});

		it('logs error when summarize fails', async () => {
			global.fetch = vi.fn().mockImplementation((url: string) => {
				if (typeof url === 'string' && url.includes('bugs.ruby-lang.org')) {
					return Promise.reject(new Error('Network error'));
				}
				return Promise.resolve({ ok: true });
			});

			const stub = createStub();
			await stub.handleEmail(ISSUE_ID);
			await runDurableObjectAlarm(stub);

			expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({ level: 'error', message: expect.stringContaining(`Summarization failed for issue #${ISSUE_ID}`), component: 'IssueDebounceObject', issueId: ISSUE_ID }));
		});

		it('clears alarm after successful processing', async () => {
			global.fetch = mockAllFetch();
			const stub = createStub();

			await stub.handleEmail(ISSUE_ID);
			await runDurableObjectAlarm(stub);

			// After alarm completes, a new cycle should work end-to-end
			const newFetch = mockAllFetch();
			global.fetch = newFetch;

			await stub.handleEmail(ISSUE_ID);
			await runDurableObjectAlarm(stub);

			const urls = newFetch.mock.calls.map((call: unknown[]) => String(call[0]));
			expect(urls.some((u: string) => u.includes(`bugs.ruby-lang.org/issues/${ISSUE_ID}`))).toBe(true);
		});

		it('clears state even when summarize fails', async () => {
			global.fetch = vi.fn().mockImplementation((url: string) => {
				if (typeof url === 'string' && url.includes('bugs.ruby-lang.org')) {
					return Promise.reject(new Error('Network error'));
				}
				return Promise.resolve({ ok: true });
			});

			const stub = createStub();
			await stub.handleEmail(ISSUE_ID);
			await runDurableObjectAlarm(stub);

			// State should be cleared - next cycle should work
			const newFetch = mockAllFetch();
			global.fetch = newFetch;

			await stub.handleEmail(ISSUE_ID);
			await runDurableObjectAlarm(stub);

			const urls = newFetch.mock.calls.map((call: unknown[]) => String(call[0]));
			expect(urls.some((u: string) => u.includes('bugs.ruby-lang.org'))).toBe(true);
		});
	});
});
