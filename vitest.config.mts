import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import tsconfigPaths from 'vite-tsconfig-paths';
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
				bindings: {
					SECRET_KEY_BASE: '01234567890123456789012345678901',
				},
			},
		}),
		tsconfigPaths(),
	],
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
