import { LanguageModel, generateText } from 'ai';
import Mustache from 'mustache';

import { Issue } from '@/entity/Issue';
import promptTemplate from '@/prompts/summarize.md';
import { SummarizeService } from '@/usecase/interface';

export class AiSummarizeService implements SummarizeService {
	constructor(private readonly llmModel: LanguageModel) {}

	async execute(issue: Issue): Promise<string> {
		const prompt = Mustache.render(promptTemplate, {
			subject: issue.subject,
			type: issue.type,
			description: issue.description,
			journals: issue.journals.map((journal) => ({
				userName: journal.userName,
				notes: journal.notes,
			})),
		});

		const { text } = await generateText({
			model: this.llmModel,
			prompt,
		});

		return text;
	}
}
