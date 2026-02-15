import { IssueType } from '@/entity/Issue';
import { Logger } from '@/service/Logger';
import { LangfuseService } from '@/service/LangfuseService';
import { SummarizePresenter } from '@/usecase/interface';

const logger = new Logger('SpanTrackedSummarizePresenter');

/**
 * Wraps a SummarizePresenter with Langfuse span tracing for observability.
 */
export class SpanTrackedSummarizePresenter implements SummarizePresenter {
	constructor(
		private readonly presenter: SummarizePresenter,
		private readonly langfuseService: LangfuseService,
		private readonly traceId: string,
	) {}

	setTitle(title: string): void {
		this.presenter.setTitle(title);
	}

	setType(type: IssueType): void {
		this.presenter.setType(type);
	}

	setLink(link: string): void {
		this.presenter.setLink(link);
	}

	setDescription(description: string): void {
		this.presenter.setDescription(description);
	}

	async render(): Promise<void> {
		const startTime = new Date();
		await this.presenter.render();
		const endTime = new Date();

		try {
			await this.langfuseService.createSpan({
				id: crypto.randomUUID(),
				traceId: this.traceId,
				name: 'discord-webhook',
				startTime,
				endTime,
				input: { webhookUrl: '[redacted]' },
				output: { success: true },
			});
		} catch (error) {
			logger.error('Failed to create discord-webhook span', { error: error instanceof Error ? error.message : String(error) });
		}
	}
}
