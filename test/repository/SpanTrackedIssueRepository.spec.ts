import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SpanTrackedIssueRepository } from '@/repository/SpanTrackedIssueRepository';
import { LangfuseService } from '@/service/LangfuseService';
import { Issue } from '@/entity/Issue';
import { IssueRepository } from '@/usecase/interface';

describe('SpanTrackedIssueRepository', () => {
	let mockFetch: ReturnType<typeof vi.fn>;
	let langfuseService: LangfuseService;
	let innerRepository: IssueRepository;

	beforeEach(() => {
		mockFetch = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal('fetch', mockFetch);
		vi.stubGlobal('crypto', {
			randomUUID: () => 'test-uuid',
		});
		langfuseService = new LangfuseService('pub-key', 'sec-key');
		innerRepository = {
			findById: vi.fn(),
		};
	});

	it('delegates findById to inner repository', async () => {
		const issue = new Issue(42);
		issue.subject = 'Test';
		vi.mocked(innerRepository.findById).mockResolvedValue(issue);

		const tracked = new SpanTrackedIssueRepository(innerRepository, langfuseService, 'trace-1');
		const result = await tracked.findById(42);

		expect(innerRepository.findById).toHaveBeenCalledWith(42);
		expect(result).toBe(issue);
	});

	it('sends fetch-issue span to Langfuse when issue found', async () => {
		const issue = new Issue(42);
		issue.subject = 'Bug report';
		vi.mocked(innerRepository.findById).mockResolvedValue(issue);

		const tracked = new SpanTrackedIssueRepository(innerRepository, langfuseService, 'trace-abc');
		await tracked.findById(42);

		expect(mockFetch).toHaveBeenCalledOnce();
		const body = JSON.parse(mockFetch.mock.calls[0][1].body);
		expect(body.batch).toHaveLength(1);
		expect(body.batch[0].type).toBe('span-create');
		expect(body.batch[0].body.traceId).toBe('trace-abc');
		expect(body.batch[0].body.name).toBe('fetch-issue');
		expect(body.batch[0].body.input).toEqual({ issueId: 42 });
		expect(body.batch[0].body.output).toEqual({ found: true, subject: 'Bug report' });
	});

	it('sends fetch-issue span with found=false when issue not found', async () => {
		vi.mocked(innerRepository.findById).mockResolvedValue(null);

		const tracked = new SpanTrackedIssueRepository(innerRepository, langfuseService, 'trace-abc');
		const result = await tracked.findById(99);

		expect(result).toBeNull();
		const body = JSON.parse(mockFetch.mock.calls[0][1].body);
		expect(body.batch[0].body.output).toEqual({ found: false, subject: undefined });
	});

	it('does not throw when span creation fails', async () => {
		const issue = new Issue(42);
		issue.subject = 'Test';
		vi.mocked(innerRepository.findById).mockResolvedValue(issue);
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const tracked = new SpanTrackedIssueRepository(innerRepository, langfuseService, 'trace-1');
		const result = await tracked.findById(42);

		expect(result).toBe(issue);
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('includes startTime and endTime in span', async () => {
		vi.mocked(innerRepository.findById).mockResolvedValue(null);

		const tracked = new SpanTrackedIssueRepository(innerRepository, langfuseService, 'trace-1');
		await tracked.findById(1);

		const body = JSON.parse(mockFetch.mock.calls[0][1].body);
		expect(body.batch[0].body.startTime).toBeDefined();
		expect(body.batch[0].body.endTime).toBeDefined();
	});
});
