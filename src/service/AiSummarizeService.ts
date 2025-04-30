import { LanguageModel, generateText } from 'ai';
import * as fs from 'fs';
import * as path from 'path';
import * as Mustache from 'mustache';

import { Issue } from '@/entity/Issue';
import { SummarizeService } from '@/usecase/interface';

export class AiSummarizeService implements SummarizeService {
	private readonly promptTemplate: string;

	constructor(private readonly llmModel: LanguageModel) {
		// Load the prompt template from file
		this.promptTemplate = fs.readFileSync(
			path.resolve(__dirname, '../prompts/summarize.md'),
			'utf-8'
		);
	}

	async execute(issue: Issue): Promise<string> {
		const journalNotes = issue.journals.flatMap((journal) => `${journal.userName}:\n${journal.notes}`).join('\n\n');

		// Render the prompt template with issue data
		const prompt = Mustache.render(this.promptTemplate, {
			subject: issue.subject,
			description: issue.description,
			journals: journalNotes
		});

		const { text } = await generateText({
			model: this.llmModel,
			prompt
		});

		return text;
	}
}
