import { LanguageModel, generateText } from 'ai';
import Mustache from 'mustache';

import { Issue } from '@/entity/Issue';
import promptTemplate from '@/prompts/summarize.md';
import { SummarizeService } from '@/usecase/interface';
import { LangfuseService } from './LangfuseService';

export class AiSummarizeService implements SummarizeService {
	constructor(
		private readonly llmModel: LanguageModel,
		private readonly langfuseService?: LangfuseService
	) {}

	async execute(issue: Issue): Promise<string> {
		const journals = issue.journals;
		const latestJournal = journals.length > 0 ? journals[journals.length - 1] : null;

		const prompt = Mustache.render(promptTemplate, {
			subject: issue.subject,
			type: issue.type,
			description: issue.description,
			authorName: issue.authorName,
			assigneeName: issue.assigneeName,
			latestJournal: latestJournal
				? {
						userName: latestJournal.userName,
						notes: latestJournal.notes,
					}
				: null,
			journals: journals.map((journal) => ({
				userName: journal.userName,
				notes: journal.notes,
			})),
		});

		const startTime = new Date();
		const { text, response, usage } = await generateText({
			model: this.llmModel,
			prompt,
		});
		const endTime = new Date();

		if (this.langfuseService) {
			try {
				await this.langfuseService.traceGeneration({
					traceId: crypto.randomUUID(),
					traceName: 'summarize-issue',
					generationId: crypto.randomUUID(),
					model: response.modelId,
					input: prompt,
					output: text,
					startTime,
					endTime,
					usage: {
						inputTokens: usage.inputTokens,
						outputTokens: usage.outputTokens,
					},
					metadata: { issueId: issue.id },
				});
			} catch (error) {
				console.error('Failed to send trace to Langfuse:', error);
			}
		}

		return text;
	}
}
