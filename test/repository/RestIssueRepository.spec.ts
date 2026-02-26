import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { RestIssueRepository } from '@/repository/RestIssueRepository';
import { IssueType } from '@/entity/Issue';

describe('RestIssueRepository', () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		global.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	describe('findById', () => {
		describe('successful response', () => {
			it('returns Issue when API responds with valid data', async () => {
				const mockResponse = {
					issue: {
						id: 12345,
						tracker: { name: 'Feature' },
						subject: 'Test Subject',
						description: 'Test Description',
						author: { id: 1, name: 'Author Name' },
						journals: [],
					},
				};

				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve(mockResponse),
				});

				const repository = new RestIssueRepository();
				const issue = await repository.findById(12345);

				expect(issue).not.toBeNull();
				expect(issue?.id).toBe(12345);
				expect(issue?.subject).toBe('Test Subject');
				expect(issue?.description).toBe('Test Description');
				expect(issue?.authorName).toBe('Author Name');
				expect(issue?.type).toBe(IssueType.Feature);
				expect(issue?.link).toBe('https://bugs.ruby-lang.org/issues/12345');
			});

			it('returns Issue with assigned_to when present', async () => {
				const mockResponse = {
					issue: {
						id: 12345,
						tracker: { name: 'Bug' },
						subject: 'Bug Report',
						description: 'Bug Description',
						author: { id: 1, name: 'Reporter' },
						assigned_to: { id: 2, name: 'Assignee' },
						journals: [],
					},
				};

				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve(mockResponse),
				});

				const repository = new RestIssueRepository();
				const issue = await repository.findById(12345);

				expect(issue?.assigneeName).toBe('Assignee');
				expect(issue?.isAssigned()).toBe(true);
			});

			it('returns Issue with journals correctly mapped', async () => {
				const mockResponse = {
					issue: {
						id: 12345,
						tracker: { name: 'Misc' },
						subject: 'Issue with comments',
						description: 'Description',
						author: { id: 1, name: 'Author' },
						journals: [
							{ id: 1, user: { id: 2, name: 'Commenter 1' }, notes: 'First comment' },
							{ id: 2, user: { id: 3, name: 'Commenter 2' }, notes: 'Second comment' },
						],
					},
				};

				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve(mockResponse),
				});

				const repository = new RestIssueRepository();
				const issue = await repository.findById(12345);

				expect(issue?.journals).toHaveLength(2);
				expect(issue?.journals[0].userName).toBe('Commenter 1');
				expect(issue?.journals[0].notes).toBe('First comment');
				expect(issue?.journals[1].userName).toBe('Commenter 2');
				expect(issue?.journals[1].notes).toBe('Second comment');
			});

			it('filters out journals with empty notes', async () => {
				const mockResponse = {
					issue: {
						id: 12345,
						tracker: { name: 'Bug' },
						subject: 'Issue',
						description: 'Description',
						author: { id: 1, name: 'Author' },
						journals: [
							{ id: 1, user: { id: 2, name: 'User 1' }, notes: 'Valid note' },
							{ id: 2, user: { id: 3, name: 'User 2' }, notes: '' },
						],
					},
				};

				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve(mockResponse),
				});

				const repository = new RestIssueRepository();
				const issue = await repository.findById(12345);

				expect(issue?.journals).toHaveLength(1);
				expect(issue?.journals[0].notes).toBe('Valid note');
			});
		});

		describe('tracker type mapping', () => {
			it('maps Feature tracker to IssueType.Feature', async () => {
				const mockResponse = {
					issue: {
						id: 1,
						tracker: { name: 'Feature' },
						subject: 'Test',
						description: 'Test',
						author: { id: 1, name: 'Author' },
						journals: [],
					},
				};

				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve(mockResponse),
				});

				const repository = new RestIssueRepository();
				const issue = await repository.findById(1);

				expect(issue?.type).toBe(IssueType.Feature);
			});

			it('maps Bug tracker to IssueType.Bug', async () => {
				const mockResponse = {
					issue: {
						id: 1,
						tracker: { name: 'Bug' },
						subject: 'Test',
						description: 'Test',
						author: { id: 1, name: 'Author' },
						journals: [],
					},
				};

				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve(mockResponse),
				});

				const repository = new RestIssueRepository();
				const issue = await repository.findById(1);

				expect(issue?.type).toBe(IssueType.Bug);
			});

			it('maps Misc tracker to IssueType.Misc', async () => {
				const mockResponse = {
					issue: {
						id: 1,
						tracker: { name: 'Misc' },
						subject: 'Test',
						description: 'Test',
						author: { id: 1, name: 'Author' },
						journals: [],
					},
				};

				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve(mockResponse),
				});

				const repository = new RestIssueRepository();
				const issue = await repository.findById(1);

				expect(issue?.type).toBe(IssueType.Misc);
			});

			it('maps unknown tracker to IssueType.Unknown', async () => {
				const mockResponse = {
					issue: {
						id: 1,
						tracker: { name: 'Custom' },
						subject: 'Test',
						description: 'Test',
						author: { id: 1, name: 'Author' },
						journals: [],
					},
				};

				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve(mockResponse),
				});

				const repository = new RestIssueRepository();
				const issue = await repository.findById(1);

				expect(issue?.type).toBe(IssueType.Unknown);
			});

			it('maps missing tracker to IssueType.Unknown', async () => {
				const mockResponse = {
					issue: {
						id: 1,
						tracker: {},
						subject: 'Test',
						description: 'Test',
						author: { id: 1, name: 'Author' },
						journals: [],
					},
				};

				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve(mockResponse),
				});

				const repository = new RestIssueRepository();
				const issue = await repository.findById(1);

				expect(issue?.type).toBe(IssueType.Unknown);
			});

			it('handles case-insensitive tracker names', async () => {
				const mockResponse = {
					issue: {
						id: 1,
						tracker: { name: 'FEATURE' },
						subject: 'Test',
						description: 'Test',
						author: { id: 1, name: 'Author' },
						journals: [],
					},
				};

				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve(mockResponse),
				});

				const repository = new RestIssueRepository();
				const issue = await repository.findById(1);

				expect(issue?.type).toBe(IssueType.Feature);
			});
		});

		describe('error handling', () => {
			it('cancels response body when API responds with error', async () => {
				const cancelFn = vi.fn();
				global.fetch = vi.fn().mockResolvedValue({
					ok: false,
					status: 404,
					statusText: 'Not Found',
					body: { cancel: cancelFn },
				});

				const repository = new RestIssueRepository();
				await repository.findById(99999);

				expect(cancelFn).toHaveBeenCalledOnce();
			});

			it('returns null when API responds with 404', async () => {
				global.fetch = vi.fn().mockResolvedValue({
					ok: false,
					status: 404,
					statusText: 'Not Found',
				});

				const repository = new RestIssueRepository();
				const issue = await repository.findById(99999);

				expect(issue).toBeNull();
			});

			it('returns null when API responds with 500', async () => {
				global.fetch = vi.fn().mockResolvedValue({
					ok: false,
					status: 500,
					statusText: 'Internal Server Error',
				});

				const repository = new RestIssueRepository();
				const issue = await repository.findById(12345);

				expect(issue).toBeNull();
			});

			it('returns null when network error occurs', async () => {
				global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

				const repository = new RestIssueRepository();
				const issue = await repository.findById(12345);

				expect(issue).toBeNull();
			});

			it('returns null when response has no issue data', async () => {
				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({}),
				});

				const repository = new RestIssueRepository();
				const issue = await repository.findById(12345);

				expect(issue).toBeNull();
			});
		});

		describe('API URL construction', () => {
			it('constructs correct API URL with issue ID', async () => {
				global.fetch = vi.fn().mockResolvedValue({
					ok: false,
					status: 404,
					statusText: 'Not Found',
				});

				const repository = new RestIssueRepository();
				await repository.findById(12345);

				expect(global.fetch).toHaveBeenCalledWith('https://bugs.ruby-lang.org/issues/12345.json?include=journals');
			});
		});

		describe('journals edge cases', () => {
			it('handles null journals array', async () => {
				const mockResponse = {
					issue: {
						id: 1,
						tracker: { name: 'Bug' },
						subject: 'Test',
						description: 'Test',
						author: { id: 1, name: 'Author' },
						journals: null,
					},
				};

				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve(mockResponse),
				});

				const repository = new RestIssueRepository();
				const issue = await repository.findById(1);

				expect(issue?.journals).toHaveLength(0);
			});

			it('handles undefined journals', async () => {
				const mockResponse = {
					issue: {
						id: 1,
						tracker: { name: 'Bug' },
						subject: 'Test',
						description: 'Test',
						author: { id: 1, name: 'Author' },
					},
				};

				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve(mockResponse),
				});

				const repository = new RestIssueRepository();
				const issue = await repository.findById(1);

				expect(issue?.journals).toHaveLength(0);
			});

			it('handles journal with null notes', async () => {
				const mockResponse = {
					issue: {
						id: 1,
						tracker: { name: 'Bug' },
						subject: 'Test',
						description: 'Test',
						author: { id: 1, name: 'Author' },
						journals: [{ id: 1, user: { id: 2, name: 'User' }, notes: null }],
					},
				};

				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve(mockResponse),
				});

				const repository = new RestIssueRepository();
				const issue = await repository.findById(1);

				expect(issue?.journals).toHaveLength(0);
			});
		});
	});

	describe('API_URL constant', () => {
		it('has correct base URL', () => {
			expect(RestIssueRepository.API_URL).toBe('https://bugs.ruby-lang.org/issues');
		});
	});
});
