import { Issue } from '@/entity/Issue';
import { SpanTrackedIssueRepository } from '@/repository/SpanTrackedIssueRepository';
import { IssueRepository } from '@/usecase/interface';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordingTracer } from '../support/recordingTracer';

describe('SpanTrackedIssueRepository', () => {
	let innerRepository: IssueRepository;

	beforeEach(() => {
		innerRepository = { findById: vi.fn() };
	});

	it('should return what the inner repository returns', async () => {
		const issue = new Issue(42, { subject: 'Test', description: '', authorName: '', link: '' });
		vi.mocked(innerRepository.findById).mockResolvedValue(issue);
		const { tracer } = recordingTracer();

		const result = await new SpanTrackedIssueRepository(innerRepository, tracer).findById(42);

		expect(innerRepository.findById).toHaveBeenCalledWith(42);
		expect(result).toBe(issue);
	});

	it('should record a fetch-issue span when the issue is found', async () => {
		const issue = new Issue(42, { subject: 'Bug report', description: '', authorName: '', link: '' });
		vi.mocked(innerRepository.findById).mockResolvedValue(issue);
		const { tracer, spans } = recordingTracer();

		await new SpanTrackedIssueRepository(innerRepository, tracer).findById(42);

		expect(spans()).toHaveLength(1);
		expect(spans()[0].name).toBe('fetch-issue');
		expect(spans()[0].attributes).toEqual({ 'issue.id': 42, 'issue.found': true });
	});

	it('should record the issue as not found when the repository returns null', async () => {
		vi.mocked(innerRepository.findById).mockResolvedValue(null);
		const { tracer, spans } = recordingTracer();

		const result = await new SpanTrackedIssueRepository(innerRepository, tracer).findById(99);

		expect(result).toBeNull();
		expect(spans()[0].attributes).toEqual({ 'issue.id': 99, 'issue.found': false });
	});

	it('should end the span and propagate the error when the repository throws', async () => {
		vi.mocked(innerRepository.findById).mockRejectedValue(new Error('Network error'));
		const { tracer, spans } = recordingTracer();

		await expect(new SpanTrackedIssueRepository(innerRepository, tracer).findById(42)).rejects.toThrow('Network error');
		expect(spans()).toHaveLength(1);
	});
});
