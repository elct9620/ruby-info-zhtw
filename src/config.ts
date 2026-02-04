import { env } from 'cloudflare:workers';

export interface Config {
	openAiGateway?: string;
	openAiApiKey: string;
	adminEmail: string;
	discordWebhook: string;
	discordClientId: string;
	discordClientSecret: string;
	discordAllowGuildId: string;
	discordAllowRoleId: string;
	secretKeyBase: string;
}

export class CloudflareConfig {
	constructor(private readonly env: Cloudflare.Env) {}

	get adminEmail(): string {
		return this.env.ADMIN_EMAIL;
	}

	get discordWebhook(): string {
		return this.env.DISCORD_WEBHOOK;
	}

	get discordClientId(): string {
		return this.env.DISCORD_CLIENT_ID;
	}

	get discordClientSecret(): string {
		return this.env.DISCORD_CLIENT_SECRET;
	}

	get openAiGateway(): string | undefined {
		return this.env.CF_AI_GATEWAY ? `${this.env.CF_AI_GATEWAY}openai` : undefined;
	}

	get openAiApiKey(): string {
		return this.env.OPENAI_API_KEY;
	}

	get secretKeyBase(): string {
		return this.env.SECRET_KEY_BASE;
	}

	get discordAllowGuildId(): string {
		return this.env.DISCORD_ALLOW_GUILD_ID;
	}

	get discordAllowRoleId(): string {
		return this.env.DISCORD_ALLOW_ROLE_ID;
	}
}

export default new CloudflareConfig(env);
