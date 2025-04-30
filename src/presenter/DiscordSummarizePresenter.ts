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

	async render(webhookUrl: string): Promise<boolean> {
		const formattedText = `## ${this.title}
${this.description.length > 1900 
	? this.description.substring(0, 1900) + "...(內容過長，已截斷)" 
	: this.description}

🔗 ${this.link}
📝 由 AI 自動翻譯 | 原始內容可能有所不同`;

		const payload = {
			content: formattedText
		};

		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			console.error(`Failed to send to Discord: ${response.status} ${response.statusText}`);
			console.error(await response.text());
		}

		return response.ok;
	}
}
