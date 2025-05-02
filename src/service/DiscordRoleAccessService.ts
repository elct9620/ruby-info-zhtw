export class DiscordRoleAccessService {
	constructor(
		private readonly guildId: string,
		private readonly roleId: string,
	) {}

	async isAllowed(token?: string, userId?: string) {}
}
