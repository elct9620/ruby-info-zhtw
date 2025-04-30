import { LanguageModel } from 'ai';

import { Issue } from '@/entity/Issue';
import { SummarizeService } from '@/usecase/interface';

export class AiSummarizeService implements SummarizeService {
	constructor(private readonly llmModel: LanguageModel) {}

	async execute(issue: Issue): Promise<string> {
		return '';
	}
}
