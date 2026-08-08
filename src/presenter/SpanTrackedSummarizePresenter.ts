import { withSpan } from '@/telemetry/withSpan';
import { SummarizePresenter, SummarizeResult } from '@/usecase/interface';
import type { Tracer } from '@opentelemetry/api';

/**
 * Wraps a SummarizePresenter so the Discord delivery appears as its own span in
 * the surrounding trace. The span records what was published, never where: the
 * webhook URL is a credential.
 */
export class SpanTrackedSummarizePresenter implements SummarizePresenter {
	constructor(
		private readonly presenter: SummarizePresenter,
		private readonly tracer: Tracer,
	) {}

	async render(result: SummarizeResult): Promise<void> {
		return withSpan(
			this.tracer,
			{
				name: 'discord-webhook',
				input: { title: result.title, link: result.link, type: result.type },
			},
			() => this.presenter.render(result),
		);
	}
}
