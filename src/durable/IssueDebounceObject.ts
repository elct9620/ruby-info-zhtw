import { DurableObject } from 'cloudflare:workers';
import { createOpenAI } from '@ai-sdk/openai';

import { CloudflareConfig } from '@/config';
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

export class IssueDebounceObject extends DurableObject<Env> {
	async handleEmail(issueId: number): Promise<void> {
		const existing = await this.ctx.storage.get<DebounceState>('state');
		const config = new CloudflareConfig(this.env);

		if (existing) {
			const currentAlarm = await this.ctx.storage.getAlarm();
			const remaining = currentAlarm ? currentAlarm - Date.now() : 0;
			console.log(`[debounce] Timer reset for issue ${issueId}, previous remaining: ${remaining}ms`);

			await this.ctx.storage.put<DebounceState>('state', {
				issueId,
				emailCount: existing.emailCount + 1,
			});
		} else {
			console.log(`[debounce] Email received, entering debounce for issue ${issueId}, DO: ${this.ctx.id}`);

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

		console.log(`[debounce] Alarm fired for issue ${state.issueId}, ${state.emailCount} emails received`);

		try {
			await this.summarize(state.issueId);
		} catch (error) {
			console.error(`[debounce] Error processing issue ${state.issueId}:`, error);
		} finally {
			await this.ctx.storage.deleteAll();
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
			console.error('Failed to create Langfuse trace:', error);
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
			console.error('Failed to finalize Langfuse trace:', error);
		}
	}
}
