import { env } from 'cloudflare:workers';

export interface Config {
	openAiGateway?: string;
	openAiApiKey: string;
	adminEmail: string;
	discordWebhook: string;
}

export class CloudflareConfig {
	constructor(private readonly env: Cloudflare.Env) {}

	get adminEmail(): string {
		return this.env.ADMIN_EMAIL;
	}

	get discordWebhook(): string {
		return this.env.DISCORD_WEBHOOK;
	}

	get openAiGateway(): string | undefined {
		return this.env.CF_AI_GATEWAY ? `${this.env.CF_AI_GATEWAY}openai` : undefined;
	}

	get openAiApiKey(): string {
		return this.env.OPENAI_API_KEY;
	}
}

export default new CloudflareConfig(env);
