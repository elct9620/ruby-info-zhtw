import { LanguageModel, generateText } from 'ai';
import Mustache from 'mustache';

import { Issue } from '@/entity/Issue';
import promptTemplate from '@/prompts/summarize.md';
import { Telemetry } from '@/telemetry/Telemetry';
import { SummarizeService } from '@/usecase/interface';

export class AiSummarizeService implements SummarizeService {
	constructor(
		private readonly llmModel: LanguageModel,
		private readonly telemetry: Telemetry,
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

		const { text } = await generateText({
			model: this.llmModel,
			prompt,
			// The AI SDK records the model, token usage and latency itself; passing the
			// integration per call keeps the generation inside the trace that owns it.
			telemetry: { integrations: this.telemetry.integration, functionId: 'summarize-issue' },
		});

		return text;
	}
}
