import { withSpan } from '@/telemetry/withSpan';
import { toErrorMessage } from '@/util/toErrorMessage';
import { SpanStatusCode, type Tracer } from '@opentelemetry/api';
import { Logger } from './Logger';

const logger = new Logger('WebhookForwardService');

export class WebhookForwardService {
	constructor(
		private readonly urls: string[],
		private readonly tracer: Tracer,
	) {}

	async execute(issueId: number): Promise<void> {
		if (this.urls.length === 0) return;

		await Promise.allSettled(this.urls.map((url) => this.forward(url, issueId)));
	}

	private async forward(url: string, issueId: number): Promise<void> {
		return withSpan(this.tracer, 'webhook-forward', async (span) => {
			span.setAttribute('server.address', this.safeHostname(url));

			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ issue_id: issueId }),
			});

			await response.body?.cancel();
			span.setAttribute('http.response.status_code', response.status);

			if (!response.ok) {
				logger.error(`Webhook forward failed for issue #${issueId}: HTTP ${response.status}`, {
					issueId,
					host: this.safeHostname(url),
					status: response.status,
				});
				// A rejected delivery is swallowed so the other URLs still run, so the
				// span is the only place the failure remains visible.
				span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${response.status}` });
				return;
			}

			logger.info(`Webhook forwarded successfully for issue #${issueId}`, { issueId, host: this.safeHostname(url) });
		}).catch((error) => {
			logger.error(`Webhook forward failed for issue #${issueId}: ${toErrorMessage(error)}`, {
				issueId,
				host: this.safeHostname(url),
				error: toErrorMessage(error),
			});
		});
	}

	private safeHostname(url: string): string {
		try {
			return new URL(url).hostname;
		} catch {
			return '[invalid-url]';
		}
	}
}
