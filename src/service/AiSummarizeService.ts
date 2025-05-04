import { LanguageModel, generateText } from 'ai';
import Mustache from 'mustache';

import { Issue } from '@/entity/Issue';
import promptTemplate from '@/prompts/summarize.md';
import { SummarizeService } from '@/usecase/interface';

export class AiSummarizeService implements SummarizeService {
	constructor(private readonly llmModel: LanguageModel) {}

	async execute(issue: Issue): Promise<string> {
		// Get the latest journal if available
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
		});

		return text;
	}
}
