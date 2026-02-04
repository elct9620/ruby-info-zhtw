import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DiscordRoleAccessService } from '@/service/DiscordRoleAccessService';

describe('DiscordRoleAccessService', () => {
	const originalFetch = global.fetch;
	const guildId = 'test-guild-id';
	const roleId = 'test-role-id';

	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		global.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	describe('isAllowed', () => {
		describe('parameter validation', () => {
			it('returns false when token is undefined', async () => {
				const service = new DiscordRoleAccessService(guildId, roleId);

				const result = await service.isAllowed(undefined, 'user-id');

				expect(result).toBe(false);
			});

			it('returns false when userId is undefined', async () => {
				const service = new DiscordRoleAccessService(guildId, roleId);

				const result = await service.isAllowed('valid-token', undefined);

				expect(result).toBe(false);
			});

			it('returns false when both token and userId are undefined', async () => {
				const service = new DiscordRoleAccessService(guildId, roleId);

				const result = await service.isAllowed(undefined, undefined);

				expect(result).toBe(false);
			});

			it('returns false when token is empty string', async () => {
				const service = new DiscordRoleAccessService(guildId, roleId);

				const result = await service.isAllowed('', 'user-id');

				expect(result).toBe(false);
			});

			it('returns false when userId is empty string', async () => {
				const service = new DiscordRoleAccessService(guildId, roleId);

				const result = await service.isAllowed('valid-token', '');

				expect(result).toBe(false);
			});
		});

		describe('successful API response', () => {
			it('returns true when user has the required role', async () => {
				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({ roles: ['other-role', roleId, 'another-role'] }),
				});

				const service = new DiscordRoleAccessService(guildId, roleId);
				const result = await service.isAllowed('valid-token', 'user-id');

				expect(result).toBe(true);
			});

			it('returns false when user does not have the required role', async () => {
				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({ roles: ['other-role', 'another-role'] }),
				});

				const service = new DiscordRoleAccessService(guildId, roleId);
				const result = await service.isAllowed('valid-token', 'user-id');

				expect(result).toBe(false);
			});

			it('returns false when user has empty roles array', async () => {
				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({ roles: [] }),
				});

				const service = new DiscordRoleAccessService(guildId, roleId);
				const result = await service.isAllowed('valid-token', 'user-id');

				expect(result).toBe(false);
			});
		});

		describe('API error handling', () => {
			it('returns false when API responds with 401', async () => {
				global.fetch = vi.fn().mockResolvedValue({
					ok: false,
					status: 401,
					text: () => Promise.resolve('Unauthorized'),
				});

				const service = new DiscordRoleAccessService(guildId, roleId);
				const result = await service.isAllowed('invalid-token', 'user-id');

				expect(result).toBe(false);
			});

			it('returns false when API responds with 403', async () => {
				global.fetch = vi.fn().mockResolvedValue({
					ok: false,
					status: 403,
					text: () => Promise.resolve('Forbidden'),
				});

				const service = new DiscordRoleAccessService(guildId, roleId);
				const result = await service.isAllowed('valid-token', 'user-id');

				expect(result).toBe(false);
			});

			it('returns false when API responds with 404', async () => {
				global.fetch = vi.fn().mockResolvedValue({
					ok: false,
					status: 404,
					text: () => Promise.resolve('Not Found'),
				});

				const service = new DiscordRoleAccessService(guildId, roleId);
				const result = await service.isAllowed('valid-token', 'user-id');

				expect(result).toBe(false);
			});

			it('returns false when API responds with 500', async () => {
				global.fetch = vi.fn().mockResolvedValue({
					ok: false,
					status: 500,
					text: () => Promise.resolve('Internal Server Error'),
				});

				const service = new DiscordRoleAccessService(guildId, roleId);
				const result = await service.isAllowed('valid-token', 'user-id');

				expect(result).toBe(false);
			});

			it('returns false when network error occurs', async () => {
				global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

				const service = new DiscordRoleAccessService(guildId, roleId);
				const result = await service.isAllowed('valid-token', 'user-id');

				expect(result).toBe(false);
			});
		});

		describe('API request', () => {
			it('calls correct Discord API endpoint', async () => {
				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({ roles: [] }),
				});

				const service = new DiscordRoleAccessService(guildId, roleId);
				await service.isAllowed('test-token', 'user-id');

				expect(global.fetch).toHaveBeenCalledWith(
					`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
					expect.any(Object)
				);
			});

			it('sends correct authorization header', async () => {
				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({ roles: [] }),
				});

				const service = new DiscordRoleAccessService(guildId, roleId);
				await service.isAllowed('my-bearer-token', 'user-id');

				expect(global.fetch).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: 'Bearer my-bearer-token',
						}),
					})
				);
			});

			it('sends correct content-type header', async () => {
				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({ roles: [] }),
				});

				const service = new DiscordRoleAccessService(guildId, roleId);
				await service.isAllowed('test-token', 'user-id');

				expect(global.fetch).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						headers: expect.objectContaining({
							'Content-Type': 'application/json',
						}),
					})
				);
			});
		});

		describe('different guild and role configurations', () => {
			it('uses configured guild ID in API call', async () => {
				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({ roles: [] }),
				});

				const customGuildId = 'custom-guild-123';
				const service = new DiscordRoleAccessService(customGuildId, roleId);
				await service.isAllowed('token', 'user');

				expect(global.fetch).toHaveBeenCalledWith(
					expect.stringContaining(customGuildId),
					expect.any(Object)
				);
			});

			it('checks for configured role ID', async () => {
				const customRoleId = 'custom-role-456';
				global.fetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({ roles: [customRoleId] }),
				});

				const service = new DiscordRoleAccessService(guildId, customRoleId);
				const result = await service.isAllowed('token', 'user');

				expect(result).toBe(true);
			});
		});
	});
});
