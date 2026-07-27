import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: './wrangler.jsonc' },
			miniflare: {
				compatibilityFlags: [
					'enable_nodejs_tty_module',
					'enable_nodejs_fs_module',
					'enable_nodejs_http_modules',
					'enable_nodejs_perf_hooks_module',
				],
				// Bound explicitly so tests never fall through to .dev.vars, which is absent in CI
				// and holds production credentials locally.
				bindings: {
					SECRET_KEY_BASE: '01234567890123456789012345678901',
					ADMIN_EMAIL: 'admin@test.invalid',
					OPENAI_API_KEY: 'test-openai-key',
					DISCORD_WEBHOOK: 'https://discord.test/api/webhooks/test',
					DISCORD_CLIENT_ID: 'test-client-id',
					DISCORD_CLIENT_SECRET: 'test-client-secret',
					CF_AI_GATEWAY: '',
					LANGFUSE_PUBLIC_KEY: '',
					LANGFUSE_SECRET_KEY: '',
					WEBHOOK_FORWARD_URLS: '',
				},
			},
		}),
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	test: {
		coverage: {
			provider: 'istanbul',
			reporter: ['text', 'lcov', 'html'],
			reportsDirectory: './coverage',
			include: ['src/**/*.ts'],
			exclude: ['src/index.ts'],
		},
	},
});
