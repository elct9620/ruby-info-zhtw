export class DiscordRoleAccessService {
	constructor(
		private readonly guildId: string,
		private readonly roleId: string,
	) {}

	/**
	 * 驗證用戶是否在指定公會中擁有有效角色
	 * @param token Discord OAuth 訪問令牌
	 * @param userId Discord 用戶 ID
	 * @returns 如果用戶在公會中並擁有有效角色，則返回 true
	 */
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
				console.error('無法獲取用戶在公會中的角色:', await memberResponse.text());
				return false;
			}

			const memberData = (await memberResponse.json()) as { roles: string[] };

			return memberData.roles.includes(this.roleId);
		} catch (error) {
			console.error('驗證 Discord 角色時出錯:', error);
			return false;
		}
	}
}
