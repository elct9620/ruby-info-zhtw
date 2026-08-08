import { IssueType } from '@/entity/Issue';
import { SpanTrackedSummarizePresenter } from '@/presenter/SpanTrackedSummarizePresenter';
import { SummarizePresenter, SummarizeResult } from '@/usecase/interface';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordingTracer } from '../support/recordingTracer';

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
	let innerPresenter: SummarizePresenter;

	beforeEach(() => {
		innerPresenter = { render: vi.fn() };
	});

	it('should delegate rendering to the inner presenter', async () => {
		const { tracer } = recordingTracer();
		const result = makeResult();

		await new SpanTrackedSummarizePresenter(innerPresenter, tracer).render(result);

		expect(innerPresenter.render).toHaveBeenCalledWith(result);
	});

	it('should record a discord-webhook span', async () => {
		const { tracer, spans } = recordingTracer();

		await new SpanTrackedSummarizePresenter(innerPresenter, tracer).render(makeResult());

		expect(spans()).toHaveLength(1);
		expect(spans()[0].name).toBe('discord-webhook');
	});

	it('should keep the webhook URL out of the span', async () => {
		const { tracer, spans } = recordingTracer();

		await new SpanTrackedSummarizePresenter(innerPresenter, tracer).render(makeResult());

		expect(spans()[0].attributes).toEqual({});
	});

	it('should end the span and propagate the error when delivery fails', async () => {
		vi.mocked(innerPresenter.render).mockRejectedValue(new Error('Discord down'));
		const { tracer, spans } = recordingTracer();

		await expect(new SpanTrackedSummarizePresenter(innerPresenter, tracer).render(makeResult())).rejects.toThrow('Discord down');
		expect(spans()).toHaveLength(1);
	});
});
