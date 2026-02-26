import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SpanTrackedSummarizePresenter } from '@/presenter/SpanTrackedSummarizePresenter';
import { LangfuseService } from '@/service/LangfuseService';
import { IssueType } from '@/entity/Issue';
import { SummarizePresenter, SummarizeResult } from '@/usecase/interface';

function makeResult(overrides: Partial<SummarizeResult> = {}): SummarizeResult {
	return {
		title: 'Test',
		description: 'Desc',
		link: 'https://example.com',
		type: IssueType.Unknown,
		...overrides,
	};
}

describe('SpanTrackedSummarizePresenter', () => {
	let mockFetch: ReturnType<typeof vi.fn>;
	let langfuseService: LangfuseService;
	let innerPresenter: SummarizePresenter;

	beforeEach(() => {
		mockFetch = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal('fetch', mockFetch);
		vi.stubGlobal('crypto', {
			randomUUID: () => 'test-uuid',
		});
		langfuseService = new LangfuseService('pub-key', 'sec-key');
		innerPresenter = {
			render: vi.fn(),
		};
	});

	it('delegates render to inner presenter and creates span', async () => {
		const tracked = new SpanTrackedSummarizePresenter(innerPresenter, langfuseService, 'trace-abc');
		const result = makeResult();
		await tracked.render(result);

		expect(innerPresenter.render).toHaveBeenCalledWith(result);
		expect(mockFetch).toHaveBeenCalledOnce();
		const body = JSON.parse(mockFetch.mock.calls[0][1].body);
		expect(body.batch).toHaveLength(1);
		expect(body.batch[0].type).toBe('span-create');
		expect(body.batch[0].body.traceId).toBe('trace-abc');
		expect(body.batch[0].body.name).toBe('discord-webhook');
		expect(body.batch[0].body.input).toEqual({ webhookUrl: '[redacted]' });
		expect(body.batch[0].body.output).toEqual({ success: true });
	});

	it('includes startTime and endTime in span', async () => {
		const tracked = new SpanTrackedSummarizePresenter(innerPresenter, langfuseService, 'trace-1');
		await tracked.render(makeResult());

		const body = JSON.parse(mockFetch.mock.calls[0][1].body);
		expect(body.batch[0].body.startTime).toBeDefined();
		expect(body.batch[0].body.endTime).toBeDefined();
	});

	it('does not throw when span creation fails', async () => {
		vi.mocked(innerPresenter.render).mockResolvedValue(undefined);
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const tracked = new SpanTrackedSummarizePresenter(innerPresenter, langfuseService, 'trace-1');
		await tracked.render(makeResult());

		expect(innerPresenter.render).toHaveBeenCalledOnce();
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});
