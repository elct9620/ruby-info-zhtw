import { UserAgent } from '@/constant';
import { IssueType } from '@/entity/Issue';
import { Logger } from '@/service/Logger';
import { SummarizePresenter, SummarizeResult } from '@/usecase/interface';

const logger = new Logger('DiscordSummarizePresenter');

export class DiscordSummarizePresenter implements SummarizePresenter {
	constructor(private readonly webhookUrl: string) {}

	async render(result: SummarizeResult): Promise<void> {
		const { color, emoji } = this.getTypeProperties(result.type);

		const payload = {
			embeds: [
				{
					title: `${emoji} ${result.title}`,
					description:
						result.description.length > 3000 ? result.description.substring(0, 3000) + '...(內容過長，已截斷)' : result.description,
					color: color,
					url: result.link,
					footer: {
						text: `由 AI 自動歸納，僅供參考 | 類型: ${result.type}`,
					},
					timestamp: new Date().toISOString(),
				},
			],
		};

		const response = await fetch(this.webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': UserAgent,
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			logger.error('Failed to send to Discord', { statusCode: response.status, url: this.webhookUrl, body: await response.text() });
		} else {
			await response.body?.cancel();
		}
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
