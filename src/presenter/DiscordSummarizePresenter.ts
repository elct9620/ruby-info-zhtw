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
		const payload = {
			embeds: [{
				title: this.title,
				description: this.description.length > 4000 
					? this.description.substring(0, 4000) + "...(內容過長，已截斷)" 
					: this.description,
				color: 0xCC342D, // Ruby red color
				url: this.link,
				footer: {
					text: "由 AI 自動翻譯 | 原始內容可能有所不同"
				},
				timestamp: new Date().toISOString()
			}]
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
