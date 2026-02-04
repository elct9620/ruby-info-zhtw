import { UserAgent } from '@/constant';
import { IssueType } from '@/entity/Issue';
import { SummarizePresenter } from '@/usecase/interface';

export class DiscordSummarizePresenter implements SummarizePresenter {
	private title: string;
	private link: string;
	private description: string;
	private type: IssueType;

	constructor() {
		this.title = '';
		this.link = '';
		this.description = '';
		this.type = IssueType.Unknown;
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

	setType(type: IssueType): void {
		this.type = type;
	}

	async render(webhookUrl: string): Promise<boolean> {
		// Get color and emoji based on issue type
		const { color, emoji } = this.getTypeProperties(this.type);
		
		const payload = {
			embeds: [
				{
					title: `${emoji} ${this.title}`,
					description: this.description.length > 3000 ? this.description.substring(0, 3000) + '...(內容過長，已截斷)' : this.description,
					color: color,
					url: this.link,
					footer: {
						text: `由 AI 自動歸納，僅供參考 | 類型: ${this.type}`,
					},
					timestamp: new Date().toISOString(),
				},
			],
		};

		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': UserAgent,
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			console.error(`Failed to send to Discord: ${response.status} ${response.statusText}`);
			console.error(await response.text());
		}

		return response.ok;
	}
	
	/**
	 * Get color and emoji based on issue type
	 */
	private getTypeProperties(type: IssueType): { color: number; emoji: string } {
		switch (type) {
			case IssueType.Feature:
				return { color: 0x2ecc71, emoji: '✨' }; // Green color for features
			case IssueType.Bug:
				return { color: 0xe74c3c, emoji: '🐛' }; // Red color for bugs
			case IssueType.Misc:
				return { color: 0x3498db, emoji: '🔧' }; // Blue color for misc
			case IssueType.Unknown:
			default:
				return { color: 0xcc342d, emoji: '💎' }; // Ruby red color for unknown/default
		}
	}
}
