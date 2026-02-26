import { toErrorMessage } from '@/util/toErrorMessage';
import { Logger } from './Logger';
import { LangfuseService } from './LangfuseService';

const logger = new Logger('WebhookForwardService');

export class WebhookForwardService {
	constructor(
		private readonly urls: string[],
		private readonly langfuseService?: LangfuseService,
		private readonly traceId?: string
	) {}

	async execute(issueId: number): Promise<void> {
		if (this.urls.length === 0) return;

		await Promise.allSettled(
			this.urls.map((url) => this.forward(url, issueId))
		);
	}

	private async forward(url: string, issueId: number): Promise<void> {
		const startTime = new Date();
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ issue_id: issueId }),
			});

			if (!response.ok) {
				logger.error(`Webhook forward failed for issue #${issueId}: HTTP ${response.status}`, { issueId, host: new URL(url).hostname, status: response.status });
				await this.createSpan(url, startTime, { success: false, status: response.status });
				return;
			}

			logger.info(`Webhook forwarded successfully for issue #${issueId}`, { issueId, host: new URL(url).hostname });
			await this.createSpan(url, startTime, { success: true });
		} catch (error) {
			logger.error(`Webhook forward failed for issue #${issueId}: ${toErrorMessage(error)}`, { issueId, host: this.safeHostname(url), error: toErrorMessage(error) });
			await this.createSpan(url, startTime, { success: false, error: toErrorMessage(error) });
		}
	}

	private async createSpan(url: string, startTime: Date, output: unknown): Promise<void> {
		if (!this.langfuseService || !this.traceId) return;

		try {
			await this.langfuseService.createSpan({
				id: crypto.randomUUID(),
				traceId: this.traceId,
				name: 'webhook-forward',
				startTime,
				endTime: new Date(),
				input: { host: this.safeHostname(url) },
				output,
			});
		} catch (error) {
			logger.error('Failed to create webhook-forward span', { error: toErrorMessage(error) });
		}
	}

	private safeHostname(url: string): string {
		try {
			return new URL(url).hostname;
		} catch {
			return '[invalid-url]';
		}
	}
}
