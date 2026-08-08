import { createOpenAI } from '@ai-sdk/openai';
import { DurableObject } from 'cloudflare:workers';

import { CloudflareConfig } from '@/config';
import { DiscordSummarizePresenter } from '@/presenter/DiscordSummarizePresenter';
import { SpanTrackedSummarizePresenter } from '@/presenter/SpanTrackedSummarizePresenter';
import { RestIssueRepository } from '@/repository/RestIssueRepository';
import { SpanTrackedIssueRepository } from '@/repository/SpanTrackedIssueRepository';
import { AiSummarizeService } from '@/service/AiSummarizeService';
import { Logger } from '@/service/Logger';
import { WebhookForwardService } from '@/service/WebhookForwardService';
import { Telemetry } from '@/telemetry/Telemetry';
import { SummarizeUsecase } from '@/usecase/SummarizeUsecase';
import { toErrorMessage } from '@/util/toErrorMessage';

interface DebounceState {
	issueId: number;
	emailCount: number;
}

const logger = new Logger('IssueDebounceObject');

export class IssueDebounceObject extends DurableObject<Env> {
	async handleEmail(issueId: number): Promise<void> {
		const existing = await this.ctx.storage.get<DebounceState>('state');
		const config = new CloudflareConfig(this.env);

		if (existing) {
			const currentAlarm = await this.ctx.storage.getAlarm();
			const remaining = currentAlarm ? currentAlarm - Date.now() : 0;
			logger.info(`Debounce timer reset due to new email for issue #${issueId}`, {
				issueId,
				durableObjectId: this.ctx.id.toString(),
				previousRemainingMs: remaining,
			});
		} else {
			logger.info(`New debounce started for issue #${issueId}`, { issueId, durableObjectId: this.ctx.id.toString() });
		}

		await this.ctx.storage.put<DebounceState>('state', {
			issueId,
			emailCount: (existing?.emailCount ?? 0) + 1,
		});

		await this.ctx.storage.setAlarm(Date.now() + config.debounceDelay);
	}

	async alarm(): Promise<void> {
		const state = await this.ctx.storage.get<DebounceState>('state');
		if (!state) return;

		const initialEmailCount = state.emailCount;
		logger.info(`Debounce alarm triggered for issue #${state.issueId} after ${state.emailCount} emails, starting summarization`, {
			issueId: state.issueId,
			emailCount: state.emailCount,
		});

		const config = new CloudflareConfig(this.env);
		const telemetry = Telemetry.create({
			publicKey: config.langfusePublicKey,
			secretKey: config.langfuseSecretKey,
			baseUrl: config.langfuseBaseUrl,
		});

		try {
			await telemetry.trace(
				{
					name: 'email-summarize',
					input: { issueId: state.issueId },
					output: (results: PromiseSettledResult<void>[]) => ({ success: results.every((result) => result.status === 'fulfilled') }),
				},
				() => this.executeTasks(state.issueId, config, telemetry),
			);
		} finally {
			await this.ctx.blockConcurrencyWhile(async () => {
				const currentState = await this.ctx.storage.get<DebounceState>('state');
				if (currentState && currentState.emailCount > initialEmailCount) {
					return;
				}
				await this.ctx.storage.deleteAlarm();
				await this.ctx.storage.deleteAll();
			});
		}
	}

	private async executeTasks(issueId: number, config: CloudflareConfig, telemetry: Telemetry): Promise<PromiseSettledResult<void>[]> {
		const results = await Promise.allSettled([
			this.summarize(issueId, config, telemetry),
			this.forwardWebhooks(issueId, config, telemetry),
		]);

		for (const result of results) {
			if (result.status === 'rejected') {
				logger.error(`Summarization failed for issue #${issueId}: ${toErrorMessage(result.reason)}`, {
					issueId,
					error: toErrorMessage(result.reason),
				});
			}
		}

		return results;
	}

	private async summarize(issueId: number, config: CloudflareConfig, telemetry: Telemetry): Promise<void> {
		const openai = createOpenAI({
			baseURL: config.openAiGateway,
			apiKey: config.openAiApiKey,
		});

		const repository = new SpanTrackedIssueRepository(new RestIssueRepository(), telemetry.tracer);
		const summarizeService = new AiSummarizeService(openai('gpt-5.6-luna'), telemetry);
		const presenter = new SpanTrackedSummarizePresenter(new DiscordSummarizePresenter(config.discordWebhook), telemetry.tracer);

		const useCase = new SummarizeUsecase(repository, summarizeService, presenter);
		await useCase.execute(issueId);
	}

	private async forwardWebhooks(issueId: number, config: CloudflareConfig, telemetry: Telemetry): Promise<void> {
		const service = new WebhookForwardService(config.webhookForwardUrls, telemetry.tracer);
		await service.execute(issueId);
	}
}
