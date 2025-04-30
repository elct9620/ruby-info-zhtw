import { LanguageModel, generateText } from 'ai';
import Mustache from 'mustache';

import { Issue } from '@/entity/Issue';
import promptTemplate from '@/prompts/summarize.md';
import { SummarizeService } from '@/usecase/interface';

export class AiSummarizeService implements SummarizeService {
	constructor(private readonly llmModel: LanguageModel) {}

	async execute(issue: Issue): Promise<string> {
		const journalNotes = issue.journals.flatMap((journal) => `${journal.userName}:\n${journal.notes}`).join('\n\n');

		const prompt = Mustache.render(promptTemplate, {
			subject: issue.subject,
			description: issue.description,
			journals: journalNotes,
		});

		const { text } = await generateText({
			model: this.llmModel,
			prompt,
		});

		return text;
	}
}
