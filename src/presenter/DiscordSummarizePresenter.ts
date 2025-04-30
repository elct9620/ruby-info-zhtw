import { SummarizePresenter } from '@/usecase/interface';

export class DiscordSummarizePresenter implements SummarizePresenter {
	private title: string;
	private link: string;
	private description: string;

	constructor() {
		this.title = '';
		this.link = '';
		this.description = '';
	}

	setTitle(title: string): void {
		this.title = title;
	}

	setLink(link: string): void {
		this.link = link;
	}

	setDescription(description: string): void {
		this.description = description;
	}

	async render(webhookUrl: string): Promise<void> {
		// TODO: implement with `fetch`
	}
}
