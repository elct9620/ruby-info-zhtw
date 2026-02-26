import { DurableObject } from 'cloudflare:workers';
import { createOpenAI } from '@ai-sdk/openai';

import { CloudflareConfig } from '@/config';
import { Logger } from '@/service/Logger';
import { toErrorMessage } from '@/util/toErrorMessage';
import { DiscordSummarizePresenter } from '@/presenter/DiscordSummarizePresenter';
import { SpanTrackedSummarizePresenter } from '@/presenter/SpanTrackedSummarizePresenter';
import { RestIssueRepository } from '@/repository/RestIssueRepository';
import { SpanTrackedIssueRepository } from '@/repository/SpanTrackedIssueRepository';
import { AiSummarizeService } from '@/service/AiSummarizeService';
import { LangfuseService } from '@/service/LangfuseService';
import { WebhookForwardService } from '@/service/WebhookForwardService';
import { SummarizeUsecase } from '@/usecase/SummarizeUsecase';

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
			logger.info(`Debounce timer reset due to new email for issue #${issueId}`, { issueId, durableObjectId: this.ctx.id.toString(), previousRemainingMs: remaining });
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
		logger.info(`Debounce alarm triggered for issue #${state.issueId} after ${state.emailCount} emails, starting summarization`, { issueId: state.issueId, emailCount: state.emailCount });

		const config = new CloudflareConfig(this.env);
		const langfuseService =
			config.langfusePublicKey && config.langfuseSecretKey
				? new LangfuseService(config.langfusePublicKey, config.langfuseSecretKey, config.langfuseBaseUrl)
				: undefined;

		const traceId = crypto.randomUUID();
		await this.initializeTrace(langfuseService, traceId, state.issueId);

		try {
			const results = await this.executeTasks(state.issueId, config, langfuseService, traceId);
			await this.finalizeTrace(langfuseService, traceId, state.issueId, results);
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

	private async initializeTrace(langfuseService: LangfuseService | undefined, traceId: string, issueId: number): Promise<void> {
		try {
			await langfuseService?.createTrace({
				id: traceId,
				name: 'email-summarize',
				input: { issueId },
				tags: ['summarize'],
			});
		} catch (error) {
			logger.error(`Failed to initialize Langfuse trace for issue #${issueId}: ${toErrorMessage(error)}`, { issueId, error: toErrorMessage(error) });
		}
	}

	private async executeTasks(issueId: number, config: CloudflareConfig, langfuseService: LangfuseService | undefined, traceId: string): Promise<PromiseSettledResult<void>[]> {
		const results = await Promise.allSettled([
			this.summarize(issueId, config, langfuseService, traceId),
			this.forwardWebhooks(issueId, config, langfuseService, traceId),
		]);

		for (const result of results) {
			if (result.status === 'rejected') {
				logger.error(`Summarization failed for issue #${issueId}: ${toErrorMessage(result.reason)}`, { issueId, error: toErrorMessage(result.reason) });
			}
		}

		return results;
	}

	private async finalizeTrace(langfuseService: LangfuseService | undefined, traceId: string, issueId: number, results: PromiseSettledResult<void>[]): Promise<void> {
		try {
			await langfuseService?.finalizeTrace({
				traceId,
				output: { success: results.every((r) => r.status === 'fulfilled') },
			});
		} catch (error) {
			logger.error(`Failed to finalize Langfuse trace for issue #${issueId}: ${toErrorMessage(error)}`, { issueId, error: toErrorMessage(error) });
		}
	}

	private async summarize(issueId: number, config: CloudflareConfig, langfuseService: LangfuseService | undefined, traceId: string): Promise<void> {
		const openai = createOpenAI({
			baseURL: config.openAiGateway,
			apiKey: config.openAiApiKey,
		});

		const repository = new RestIssueRepository();
		const summarizeService = new AiSummarizeService(openai('gpt-5-mini'), langfuseService, langfuseService ? traceId : undefined);

		const trackedRepository = langfuseService
			? new SpanTrackedIssueRepository(repository, langfuseService, traceId)
			: repository;

		const basePresenter = new DiscordSummarizePresenter(config.discordWebhook);
		const presenter = langfuseService
			? new SpanTrackedSummarizePresenter(basePresenter, langfuseService, traceId)
			: basePresenter;

		const useCase = new SummarizeUsecase(trackedRepository, summarizeService, presenter);
		await useCase.execute(issueId);
	}

	private async forwardWebhooks(issueId: number, config: CloudflareConfig, langfuseService: LangfuseService | undefined, traceId: string): Promise<void> {
		const service = new WebhookForwardService(config.webhookForwardUrls, langfuseService, traceId);
		await service.execute(issueId);
	}
}
