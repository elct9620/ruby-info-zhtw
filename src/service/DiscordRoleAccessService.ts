import { Logger } from './Logger';

const logger = new Logger('DiscordRoleAccessService');

type DiscordGuideMember = {
	roles: string[];
};

export class DiscordRoleAccessService {
	constructor(
		private readonly guildId: string,
		private readonly roleId: string,
	) {}

	async isAllowed(token?: string, userId?: string): Promise<boolean> {
		if (!userId || !token) return false;

		try {
			const memberResponse = await fetch(`https://discord.com/api/v10/users/@me/guilds/${this.guildId}/member`, {
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			});

			if (!memberResponse.ok) {
				logger.error(`Discord API returned HTTP ${memberResponse.status} when fetching member roles`, { statusCode: memberResponse.status, error: await memberResponse.text() });
				return false;
			}

			const memberData = (await memberResponse.json()) as DiscordGuideMember;

			return memberData.roles.includes(this.roleId);
		} catch (error) {
			logger.error(`Unexpected error fetching Discord member roles: ${error instanceof Error ? error.message : String(error)}`, { error: error instanceof Error ? error.message : String(error) });
			return false;
		}
	}
}
