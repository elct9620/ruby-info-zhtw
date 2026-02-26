import { describe, expect, it } from 'vitest';
import { CloudflareConfig } from '@/config';

type MockEnv = Pick<
	Cloudflare.Env,
	| 'ADMIN_EMAIL'
	| 'DISCORD_WEBHOOK'
	| 'DISCORD_CLIENT_ID'
	| 'DISCORD_CLIENT_SECRET'
	| 'OPENAI_API_KEY'
	| 'SECRET_KEY_BASE'
	| 'DISCORD_ALLOW_GUILD_ID'
	| 'DISCORD_ALLOW_ROLE_ID'
	| 'CF_AI_GATEWAY'
	| 'LANGFUSE_SECRET_KEY'
	| 'LANGFUSE_PUBLIC_KEY'
	| 'LANGFUSE_BASE_URL'
	| 'WEBHOOK_FORWARD_URLS'
>;

describe('CloudflareConfig', () => {
	const createMockEnv = (overrides: Partial<MockEnv> = {}): Cloudflare.Env =>
		({
			ADMIN_EMAIL: 'admin@example.com',
			DISCORD_WEBHOOK: 'https://discord.webhook/test',
			DISCORD_CLIENT_ID: 'client-id-123',
			DISCORD_CLIENT_SECRET: 'client-secret-456',
			OPENAI_API_KEY: 'openai-key-789',
			SECRET_KEY_BASE: 'secret-key-base-abc',
			DISCORD_ALLOW_GUILD_ID: 'guild-id-def',
			DISCORD_ALLOW_ROLE_ID: 'role-id-ghi',
			CF_AI_GATEWAY: '',
			...overrides,
		}) as Cloudflare.Env;

	describe('adminEmail', () => {
		it('returns ADMIN_EMAIL from env', () => {
			const env = createMockEnv({ ADMIN_EMAIL: 'test@admin.com' });
			const config = new CloudflareConfig(env);

			expect(config.adminEmail).toBe('test@admin.com');
		});
	});

	describe('discordWebhook', () => {
		it('returns DISCORD_WEBHOOK from env', () => {
			const env = createMockEnv({ DISCORD_WEBHOOK: 'https://discord.com/api/webhooks/123/abc' });
			const config = new CloudflareConfig(env);

			expect(config.discordWebhook).toBe('https://discord.com/api/webhooks/123/abc');
		});
	});

	describe('discordClientId', () => {
		it('returns DISCORD_CLIENT_ID from env', () => {
			const env = createMockEnv({ DISCORD_CLIENT_ID: 'my-client-id' });
			const config = new CloudflareConfig(env);

			expect(config.discordClientId).toBe('my-client-id');
		});
	});

	describe('discordClientSecret', () => {
		it('returns DISCORD_CLIENT_SECRET from env', () => {
			const env = createMockEnv({ DISCORD_CLIENT_SECRET: 'my-client-secret' });
			const config = new CloudflareConfig(env);

			expect(config.discordClientSecret).toBe('my-client-secret');
		});
	});

	describe('openAiApiKey', () => {
		it('returns OPENAI_API_KEY from env', () => {
			const env = createMockEnv({ OPENAI_API_KEY: 'sk-test-key' });
			const config = new CloudflareConfig(env);

			expect(config.openAiApiKey).toBe('sk-test-key');
		});
	});

	describe('secretKeyBase', () => {
		it('returns SECRET_KEY_BASE from env', () => {
			const env = createMockEnv({ SECRET_KEY_BASE: 'my-secret-key-base' });
			const config = new CloudflareConfig(env);

			expect(config.secretKeyBase).toBe('my-secret-key-base');
		});
	});

	describe('discordAllowGuildId', () => {
		it('returns DISCORD_ALLOW_GUILD_ID from env', () => {
			const env = createMockEnv({ DISCORD_ALLOW_GUILD_ID: 'guild-123' });
			const config = new CloudflareConfig(env);

			expect(config.discordAllowGuildId).toBe('guild-123');
		});
	});

	describe('discordAllowRoleId', () => {
		it('returns DISCORD_ALLOW_ROLE_ID from env', () => {
			const env = createMockEnv({ DISCORD_ALLOW_ROLE_ID: 'role-456' });
			const config = new CloudflareConfig(env);

			expect(config.discordAllowRoleId).toBe('role-456');
		});
	});

	describe('openAiGateway', () => {
		it('returns undefined when CF_AI_GATEWAY is empty string', () => {
			const env = createMockEnv({ CF_AI_GATEWAY: '' });
			const config = new CloudflareConfig(env);

			expect(config.openAiGateway).toBeUndefined();
		});

		it('returns gateway URL with openai suffix when CF_AI_GATEWAY is set', () => {
			const env = createMockEnv({ CF_AI_GATEWAY: 'https://gateway.ai.cloudflare.com/v1/account/gateway/' });
			const config = new CloudflareConfig(env);

			expect(config.openAiGateway).toBe('https://gateway.ai.cloudflare.com/v1/account/gateway/openai');
		});

		it('appends openai to gateway URL without trailing slash', () => {
			const env = createMockEnv({ CF_AI_GATEWAY: 'https://gateway.ai.cloudflare.com/v1/account/gateway' });
			const config = new CloudflareConfig(env);

			expect(config.openAiGateway).toBe('https://gateway.ai.cloudflare.com/v1/account/gatewayopenai');
		});
	});

	describe('langfuseSecretKey', () => {
		it('returns LANGFUSE_SECRET_KEY from env', () => {
			const env = createMockEnv({ LANGFUSE_SECRET_KEY: 'sk-lf-test' } as Partial<MockEnv>);
			const config = new CloudflareConfig(env);

			expect(config.langfuseSecretKey).toBe('sk-lf-test');
		});

		it('returns undefined when LANGFUSE_SECRET_KEY is not set', () => {
			const env = createMockEnv();
			const config = new CloudflareConfig(env);

			expect(config.langfuseSecretKey).toBeUndefined();
		});
	});

	describe('langfusePublicKey', () => {
		it('returns LANGFUSE_PUBLIC_KEY from env', () => {
			const env = createMockEnv({ LANGFUSE_PUBLIC_KEY: 'pk-lf-test' } as Partial<MockEnv>);
			const config = new CloudflareConfig(env);

			expect(config.langfusePublicKey).toBe('pk-lf-test');
		});

		it('returns undefined when LANGFUSE_PUBLIC_KEY is not set', () => {
			const env = createMockEnv();
			const config = new CloudflareConfig(env);

			expect(config.langfusePublicKey).toBeUndefined();
		});
	});

	describe('debounceDelay', () => {
		it('returns default 300000ms when DEBOUNCE_DELAY is not set', () => {
			const env = createMockEnv();
			const config = new CloudflareConfig(env);

			expect(config.debounceDelay).toBe(300000);
		});

		it('converts DEBOUNCE_DELAY seconds to milliseconds', () => {
			const env = createMockEnv({ DEBOUNCE_DELAY: '60' } as Partial<MockEnv>);
			const config = new CloudflareConfig(env);

			expect(config.debounceDelay).toBe(60000);
		});

		it('handles zero value', () => {
			const env = createMockEnv({ DEBOUNCE_DELAY: '0' } as Partial<MockEnv>);
			const config = new CloudflareConfig(env);

			expect(config.debounceDelay).toBe(0);
		});
	});

	describe('webhookForwardUrls', () => {
		it('returns empty array when WEBHOOK_FORWARD_URLS is empty', () => {
			const env = createMockEnv({ WEBHOOK_FORWARD_URLS: '' });
			const config = new CloudflareConfig(env);

			expect(config.webhookForwardUrls).toEqual([]);
		});

		it('returns single URL', () => {
			const env = createMockEnv({ WEBHOOK_FORWARD_URLS: 'https://example.com/webhook' });
			const config = new CloudflareConfig(env);

			expect(config.webhookForwardUrls).toEqual(['https://example.com/webhook']);
		});

		it('returns multiple URLs split by comma', () => {
			const env = createMockEnv({ WEBHOOK_FORWARD_URLS: 'https://a.com/hook,https://b.com/hook' });
			const config = new CloudflareConfig(env);

			expect(config.webhookForwardUrls).toEqual(['https://a.com/hook', 'https://b.com/hook']);
		});

		it('trims whitespace around URLs', () => {
			const env = createMockEnv({ WEBHOOK_FORWARD_URLS: ' https://a.com/hook , https://b.com/hook ' });
			const config = new CloudflareConfig(env);

			expect(config.webhookForwardUrls).toEqual(['https://a.com/hook', 'https://b.com/hook']);
		});

		it('ignores trailing comma', () => {
			const env = createMockEnv({ WEBHOOK_FORWARD_URLS: 'https://a.com/hook,' });
			const config = new CloudflareConfig(env);

			expect(config.webhookForwardUrls).toEqual(['https://a.com/hook']);
		});
	});

	describe('langfuseBaseUrl', () => {
		it('returns LANGFUSE_BASE_URL from env when set', () => {
			const env = createMockEnv({ LANGFUSE_BASE_URL: 'https://custom.langfuse.com' } as Partial<MockEnv>);
			const config = new CloudflareConfig(env);

			expect(config.langfuseBaseUrl).toBe('https://custom.langfuse.com');
		});

		it('returns default URL when LANGFUSE_BASE_URL is not set', () => {
			const env = createMockEnv();
			const config = new CloudflareConfig(env);

			expect(config.langfuseBaseUrl).toBe('https://cloud.langfuse.com');
		});
	});
});
