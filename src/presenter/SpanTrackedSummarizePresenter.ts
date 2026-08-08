import { withSpan } from '@/telemetry/withSpan';
import { SummarizePresenter, SummarizeResult } from '@/usecase/interface';
import type { Tracer } from '@opentelemetry/api';

/**
 * Wraps a SummarizePresenter so the Discord delivery appears as its own span in
 * the surrounding trace. The span carries no attributes: the webhook URL is a
 * credential, and everything else worth knowing is the span's own timing.
 */
export class SpanTrackedSummarizePresenter implements SummarizePresenter {
	constructor(
		private readonly presenter: SummarizePresenter,
		private readonly tracer: Tracer,
	) {}

	async render(result: SummarizeResult): Promise<void> {
		return withSpan(this.tracer, 'discord-webhook', () => this.presenter.render(result));
	}
}
