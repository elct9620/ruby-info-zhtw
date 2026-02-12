import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SpanTrackedSummarizePresenter } from '@/presenter/SpanTrackedSummarizePresenter';
import { LangfuseService } from '@/service/LangfuseService';
import { IssueType } from '@/entity/Issue';
import { SummarizePresenter } from '@/usecase/interface';

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
			setTitle: vi.fn(),
			setType: vi.fn(),
			setLink: vi.fn(),
			setDescription: vi.fn(),
			render: vi.fn(),
		};
	});

	it('delegates setTitle to inner presenter', () => {
		const tracked = new SpanTrackedSummarizePresenter(innerPresenter, langfuseService, 'trace-1');
		tracked.setTitle('Test Title');

		expect(innerPresenter.setTitle).toHaveBeenCalledWith('Test Title');
	});

	it('delegates setType to inner presenter', () => {
		const tracked = new SpanTrackedSummarizePresenter(innerPresenter, langfuseService, 'trace-1');
		tracked.setType(IssueType.Bug);

		expect(innerPresenter.setType).toHaveBeenCalledWith(IssueType.Bug);
	});

	it('delegates setLink to inner presenter', () => {
		const tracked = new SpanTrackedSummarizePresenter(innerPresenter, langfuseService, 'trace-1');
		tracked.setLink('https://example.com');

		expect(innerPresenter.setLink).toHaveBeenCalledWith('https://example.com');
	});

	it('delegates setDescription to inner presenter', () => {
		const tracked = new SpanTrackedSummarizePresenter(innerPresenter, langfuseService, 'trace-1');
		tracked.setDescription('Test Description');

		expect(innerPresenter.setDescription).toHaveBeenCalledWith('Test Description');
	});

	it('delegates render to inner presenter and creates span', async () => {
		const tracked = new SpanTrackedSummarizePresenter(innerPresenter, langfuseService, 'trace-abc');
		await tracked.render();

		expect(innerPresenter.render).toHaveBeenCalledOnce();
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
		await tracked.render();

		const body = JSON.parse(mockFetch.mock.calls[0][1].body);
		expect(body.batch[0].body.startTime).toBeDefined();
		expect(body.batch[0].body.endTime).toBeDefined();
	});

	it('does not throw when span creation fails', async () => {
		vi.mocked(innerPresenter.render).mockResolvedValue(undefined);
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const tracked = new SpanTrackedSummarizePresenter(innerPresenter, langfuseService, 'trace-1');
		await tracked.render();

		expect(innerPresenter.render).toHaveBeenCalledOnce();
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});
