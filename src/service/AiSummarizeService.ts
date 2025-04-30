import { LanguageModel, generateText } from 'ai';

import { Issue } from '@/entity/Issue';
import { SummarizeService } from '@/usecase/interface';

export class AiSummarizeService implements SummarizeService {
	private readonly prompt = `
Translate the following issue description into Traditional Chinese with following rules:

1. You MUST use Traditional Chinese (Taiwan) for all translations.
2. You MUST keep code blocks and formatting in the original format.
3. Use simple and clear language to explain the issue.
`;

	constructor(private readonly llmModel: LanguageModel) {}

	async execute(issue: Issue): Promise<string> {
		const journalNotes = issue.journals.flatMap((journal) => `${journal.userName}:\n${journal.notes}`).join('\n\n');

		const { text } = await generateText({
			model: this.llmModel,
			prompt: `${this.prompt}\n\n Subject: ${issue.subject}\n\nDescription:\n${issue.description}\n\nJournals:\n${journalNotes}`,
		});

		return text;
	}
}
