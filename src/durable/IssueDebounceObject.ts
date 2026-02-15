import { DurableObject } from 'cloudflare:workers';
import { createOpenAI } from '@ai-sdk/openai';

import { CloudflareConfig } from '@/config';
import { Logger } from '@/service/Logger';
import { DiscordSummarizePresenter } from '@/presenter/DiscordSummarizePresenter';
import { SpanTrackedSummarizePresenter } from '@/presenter/SpanTrackedSummarizePresenter';
import { RestIssueRepository } from '@/repository/RestIssueRepository';
import { SpanTrackedIssueRepository } from '@/repository/SpanTrackedIssueRepository';
import { AiSummarizeService } from '@/service/AiSummarizeService';
import { LangfuseService } from '@/service/LangfuseService';
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
			logger.info('Timer reset for issue', { issueId, durableObjectId: this.ctx.id.toString(), previousRemainingMs: remaining });

			await this.ctx.storage.put<DebounceState>('state', {
				issueId,
				emailCount: existing.emailCount + 1,
			});
		} else {
			logger.info('Email received, entering debounce', { issueId, durableObjectId: this.ctx.id.toString() });

			await this.ctx.storage.put<DebounceState>('state', {
				issueId,
				emailCount: 1,
			});
		}

		await this.ctx.storage.setAlarm(Date.now() + config.debounceDelay);
	}

	async alarm(): Promise<void> {
		const state = await this.ctx.storage.get<DebounceState>('state');
		if (!state) return;

		const initialEmailCount = state.emailCount;
		logger.info('Alarm fired', { issueId: state.issueId, emailCount: state.emailCount });

		try {
			await this.summarize(state.issueId);
		} catch (error) {
			logger.error('Error processing issue', { issueId: state.issueId, error: error instanceof Error ? error.message : String(error) });
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

	private async summarize(issueId: number): Promise<void> {
		const config = new CloudflareConfig(this.env);

		const openai = createOpenAI({
			baseURL: config.openAiGateway,
			apiKey: config.openAiApiKey,
		});

		const langfuseService =
			config.langfusePublicKey && config.langfuseSecretKey
				? new LangfuseService(config.langfusePublicKey, config.langfuseSecretKey, config.langfuseBaseUrl)
				: undefined;

		const traceId = crypto.randomUUID();
		try {
			await langfuseService?.createTrace({
				id: traceId,
				name: 'email-summarize',
				input: { issueId },
				tags: ['summarize'],
			});
		} catch (error) {
			logger.error('Failed to create Langfuse trace', { error: error instanceof Error ? error.message : String(error) });
		}

		const repository = new RestIssueRepository();
		const summarizeService = new AiSummarizeService(openai('gpt-5-mini'), langfuseService);
		if (langfuseService) {
			summarizeService.setTraceId(traceId);
		}

		const trackedRepository = langfuseService
			? new SpanTrackedIssueRepository(repository, langfuseService, traceId)
			: repository;

		const basePresenter = new DiscordSummarizePresenter(config.discordWebhook);
		const presenter = langfuseService
			? new SpanTrackedSummarizePresenter(basePresenter, langfuseService, traceId)
			: basePresenter;

		const useCase = new SummarizeUsecase(trackedRepository, summarizeService, presenter);
		await useCase.execute(issueId);

		try {
			await langfuseService?.finalizeTrace({
				traceId,
				output: { success: true },
			});
		} catch (error) {
			logger.error('Failed to finalize Langfuse trace', { error: error instanceof Error ? error.message : String(error) });
		}
	}
}
