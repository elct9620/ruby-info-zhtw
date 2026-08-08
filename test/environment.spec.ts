import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

/**
 * `vitest.config.mts` binds every value a test can see so a run behaves the
 * same on a developer machine and in CI. `.dev.vars` holds production
 * credentials locally, and a test that reached them would export real traces
 * and charge a real account.
 */
describe('test environment', () => {
	it('should leave Langfuse credentials empty so telemetry stays disabled', () => {
		expect(env.LANGFUSE_PUBLIC_KEY).toBe('');
		expect(env.LANGFUSE_SECRET_KEY).toBe('');
	});

	it('should bind placeholder credentials rather than the local .dev.vars values', () => {
		expect(env.OPENAI_API_KEY).toBe('test-openai-key');
		expect(env.DISCORD_WEBHOOK).toBe('https://discord.test/api/webhooks/test');
	});
});
