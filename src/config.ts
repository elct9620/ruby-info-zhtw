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
	langfuseSecretKey?: string;
	langfusePublicKey?: string;
	langfuseBaseUrl?: string;
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

	get langfuseSecretKey(): string | undefined {
		return this.env.LANGFUSE_SECRET_KEY || undefined;
	}

	get langfusePublicKey(): string | undefined {
		return this.env.LANGFUSE_PUBLIC_KEY || undefined;
	}

	get langfuseBaseUrl(): string {
		return this.env.LANGFUSE_BASEURL || 'https://cloud.langfuse.com';
	}
}

export default new CloudflareConfig(env);
