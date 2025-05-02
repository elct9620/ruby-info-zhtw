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
				console.error('Unable to fetch user roles:', await memberResponse.text());
				return false;
			}

			const memberData = (await memberResponse.json()) as DiscordGuideMember;

			return memberData.roles.includes(this.roleId);
		} catch (error) {
			console.error('Unable to fetch user roles:', error);
			return false;
		}
	}
}
