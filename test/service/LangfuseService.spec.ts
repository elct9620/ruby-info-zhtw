import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LangfuseService } from '@/service/LangfuseService';

describe('LangfuseService', () => {
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockFetch = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal('fetch', mockFetch);
		vi.stubGlobal('crypto', {
			randomUUID: () => 'test-uuid',
		});
	});

	describe('constructor', () => {
		it('uses default base URL when not provided', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.traceGeneration({
				traceId: 'trace-1',
				traceName: 'test-trace',
				generationId: 'gen-1',
				model: 'gpt-5-mini',
				input: 'test input',
				output: 'test output',
				startTime: new Date('2024-01-01T00:00:00Z'),
				endTime: new Date('2024-01-01T00:00:01Z'),
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'https://cloud.langfuse.com/api/public/ingestion',
				expect.any(Object)
			);
		});

		it('uses custom base URL when provided', async () => {
			const service = new LangfuseService('public-key', 'secret-key', 'https://custom.langfuse.com');

			await service.traceGeneration({
				traceId: 'trace-1',
				traceName: 'test-trace',
				generationId: 'gen-1',
				model: 'gpt-5-mini',
				input: 'test input',
				output: 'test output',
				startTime: new Date('2024-01-01T00:00:00Z'),
				endTime: new Date('2024-01-01T00:00:01Z'),
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'https://custom.langfuse.com/api/public/ingestion',
				expect.any(Object)
			);
		});
	});

	describe('traceGeneration', () => {
		it('sends correct authorization header', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.traceGeneration({
				traceId: 'trace-1',
				traceName: 'test-trace',
				generationId: 'gen-1',
				model: 'gpt-5-mini',
				input: 'test input',
				output: 'test output',
				startTime: new Date('2024-01-01T00:00:00Z'),
				endTime: new Date('2024-01-01T00:00:01Z'),
			});

			const callArgs = mockFetch.mock.calls[0][1];
			expect(callArgs.headers.Authorization).toBe('Basic ' + btoa('public-key:secret-key'));
		});

		it('sends trace-create and generation-create events in batch', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.traceGeneration({
				traceId: 'trace-123',
				traceName: 'summarize-issue',
				generationId: 'gen-456',
				model: 'gpt-5-mini',
				input: 'prompt text',
				output: 'response text',
				startTime: new Date('2024-01-01T00:00:00Z'),
				endTime: new Date('2024-01-01T00:00:01Z'),
				metadata: { issueId: 12345 },
			});

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body);

			expect(body.batch).toHaveLength(2);
			expect(body.batch[0].type).toBe('trace-create');
			expect(body.batch[0].body.id).toBe('trace-123');
			expect(body.batch[0].body.name).toBe('summarize-issue');
			expect(body.batch[0].body.metadata).toEqual({ issueId: 12345 });

			expect(body.batch[1].type).toBe('generation-create');
			expect(body.batch[1].body.id).toBe('gen-456');
			expect(body.batch[1].body.traceId).toBe('trace-123');
			expect(body.batch[1].body.name).toBe('llm-call');
			expect(body.batch[1].body.model).toBe('gpt-5-mini');
			expect(body.batch[1].body.input).toBe('prompt text');
			expect(body.batch[1].body.output).toBe('response text');
		});

		it('includes timestamps in ISO format', async () => {
			const service = new LangfuseService('public-key', 'secret-key');
			const startTime = new Date('2024-01-01T10:00:00Z');
			const endTime = new Date('2024-01-01T10:00:05Z');

			await service.traceGeneration({
				traceId: 'trace-1',
				traceName: 'test',
				generationId: 'gen-1',
				model: 'gpt-5-mini',
				input: 'input',
				output: 'output',
				startTime,
				endTime,
			});

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body);

			expect(body.batch[1].body.startTime).toBe('2024-01-01T10:00:00.000Z');
			expect(body.batch[1].body.endTime).toBe('2024-01-01T10:00:05.000Z');
		});

		it('logs error when API call fails', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

			const service = new LangfuseService('public-key', 'secret-key');

			await service.traceGeneration({
				traceId: 'trace-1',
				traceName: 'test',
				generationId: 'gen-1',
				model: 'gpt-5-mini',
				input: 'input',
				output: 'output',
				startTime: new Date(),
				endTime: new Date(),
			});

			expect(consoleSpy).toHaveBeenCalledWith('Langfuse ingestion failed: 500 Internal Server Error');
			consoleSpy.mockRestore();
		});

		it('sends correct Content-Type header', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.traceGeneration({
				traceId: 'trace-1',
				traceName: 'test',
				generationId: 'gen-1',
				model: 'gpt-5-mini',
				input: 'input',
				output: 'output',
				startTime: new Date(),
				endTime: new Date(),
			});

			const callArgs = mockFetch.mock.calls[0][1];
			expect(callArgs.headers['Content-Type']).toBe('application/json');
		});

		it('uses POST method', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.traceGeneration({
				traceId: 'trace-1',
				traceName: 'test',
				generationId: 'gen-1',
				model: 'gpt-5-mini',
				input: 'input',
				output: 'output',
				startTime: new Date(),
				endTime: new Date(),
			});

			const callArgs = mockFetch.mock.calls[0][1];
			expect(callArgs.method).toBe('POST');
		});

		it('handles metadata being undefined', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.traceGeneration({
				traceId: 'trace-1',
				traceName: 'test',
				generationId: 'gen-1',
				model: 'gpt-5-mini',
				input: 'input',
				output: 'output',
				startTime: new Date(),
				endTime: new Date(),
			});

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body);

			expect(body.batch[0].body.metadata).toBeUndefined();
		});

		it('includes usage information when provided', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.traceGeneration({
				traceId: 'trace-1',
				traceName: 'test',
				generationId: 'gen-1',
				model: 'gpt-5-mini',
				input: 'input',
				output: 'output',
				startTime: new Date(),
				endTime: new Date(),
				usage: { inputTokens: 150, outputTokens: 75 },
			});

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body);

			expect(body.batch[1].body.usage).toEqual({ input: 150, output: 75 });
		});

		it('handles usage being undefined', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.traceGeneration({
				traceId: 'trace-1',
				traceName: 'test',
				generationId: 'gen-1',
				model: 'gpt-5-mini',
				input: 'input',
				output: 'output',
				startTime: new Date(),
				endTime: new Date(),
			});

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body);

			expect(body.batch[1].body.usage).toBeUndefined();
		});
	});

	describe('createTrace', () => {
		it('sends trace-create event with correct body', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.createTrace({
				id: 'trace-abc',
				name: 'email-processing',
				input: { emailId: '123' },
				metadata: { source: 'ruby-core' },
				tags: ['email', 'ruby'],
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'https://cloud.langfuse.com/api/public/ingestion',
				expect.any(Object)
			);

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body);

			expect(body.batch).toHaveLength(1);
			expect(body.batch[0].type).toBe('trace-create');
			expect(body.batch[0].body.id).toBe('trace-abc');
			expect(body.batch[0].body.name).toBe('email-processing');
			expect(body.batch[0].body.input).toEqual({ emailId: '123' });
			expect(body.batch[0].body.metadata).toEqual({ source: 'ruby-core' });
			expect(body.batch[0].body.tags).toEqual(['email', 'ruby']);
		});

		it('sends correct headers and method', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.createTrace({ id: 'trace-1', name: 'test' });

			const callArgs = mockFetch.mock.calls[0][1];
			expect(callArgs.method).toBe('POST');
			expect(callArgs.headers['Content-Type']).toBe('application/json');
			expect(callArgs.headers.Authorization).toBe('Basic ' + btoa('public-key:secret-key'));
		});

		it('handles optional params being undefined', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.createTrace({ id: 'trace-1', name: 'test' });

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body);

			expect(body.batch[0].body.input).toBeUndefined();
			expect(body.batch[0].body.metadata).toBeUndefined();
			expect(body.batch[0].body.tags).toBeUndefined();
		});

		it('includes batch event id and timestamp', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.createTrace({ id: 'trace-1', name: 'test' });

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body);

			expect(body.batch[0].id).toBe('test-uuid');
			expect(body.batch[0].timestamp).toBeDefined();
		});

		it('logs error when API call fails', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			mockFetch.mockResolvedValueOnce({ ok: false, status: 400, statusText: 'Bad Request' });

			const service = new LangfuseService('public-key', 'secret-key');
			await service.createTrace({ id: 'trace-1', name: 'test' });

			expect(consoleSpy).toHaveBeenCalledWith('Langfuse ingestion failed: 400 Bad Request');
			consoleSpy.mockRestore();
		});
	});

	describe('createSpan', () => {
		it('sends span-create event with correct body', async () => {
			const service = new LangfuseService('public-key', 'secret-key');
			const startTime = new Date('2024-01-01T10:00:00Z');
			const endTime = new Date('2024-01-01T10:00:05Z');

			await service.createSpan({
				id: 'span-1',
				traceId: 'trace-abc',
				name: 'fetch-issue',
				startTime,
				endTime,
				input: { issueId: 42 },
				output: { title: 'Bug report' },
				metadata: { step: 'repository' },
			});

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body);

			expect(body.batch).toHaveLength(1);
			expect(body.batch[0].type).toBe('span-create');
			expect(body.batch[0].body.id).toBe('span-1');
			expect(body.batch[0].body.traceId).toBe('trace-abc');
			expect(body.batch[0].body.name).toBe('fetch-issue');
			expect(body.batch[0].body.startTime).toBe('2024-01-01T10:00:00.000Z');
			expect(body.batch[0].body.endTime).toBe('2024-01-01T10:00:05.000Z');
			expect(body.batch[0].body.input).toEqual({ issueId: 42 });
			expect(body.batch[0].body.output).toEqual({ title: 'Bug report' });
			expect(body.batch[0].body.metadata).toEqual({ step: 'repository' });
		});

		it('sends correct headers and method', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.createSpan({
				id: 'span-1',
				traceId: 'trace-1',
				name: 'test',
				startTime: new Date(),
				endTime: new Date(),
			});

			const callArgs = mockFetch.mock.calls[0][1];
			expect(callArgs.method).toBe('POST');
			expect(callArgs.headers['Content-Type']).toBe('application/json');
			expect(callArgs.headers.Authorization).toBe('Basic ' + btoa('public-key:secret-key'));
		});

		it('handles optional params being undefined', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.createSpan({
				id: 'span-1',
				traceId: 'trace-1',
				name: 'test',
				startTime: new Date(),
				endTime: new Date(),
			});

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body);

			expect(body.batch[0].body.input).toBeUndefined();
			expect(body.batch[0].body.output).toBeUndefined();
			expect(body.batch[0].body.metadata).toBeUndefined();
		});

		it('logs error when API call fails', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

			const service = new LangfuseService('public-key', 'secret-key');
			await service.createSpan({
				id: 'span-1',
				traceId: 'trace-1',
				name: 'test',
				startTime: new Date(),
				endTime: new Date(),
			});

			expect(consoleSpy).toHaveBeenCalledWith('Langfuse ingestion failed: 500 Internal Server Error');
			consoleSpy.mockRestore();
		});
	});

	describe('finalizeTrace', () => {
		it('sends trace-create event for upsert with correct body', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.finalizeTrace({
				traceId: 'trace-abc',
				output: { summary: 'Issue resolved' },
				metadata: { status: 'completed' },
			});

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body);

			expect(body.batch).toHaveLength(1);
			expect(body.batch[0].type).toBe('trace-create');
			expect(body.batch[0].body.id).toBe('trace-abc');
			expect(body.batch[0].body.output).toEqual({ summary: 'Issue resolved' });
			expect(body.batch[0].body.metadata).toEqual({ status: 'completed' });
		});

		it('sends correct headers and method', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.finalizeTrace({ traceId: 'trace-1' });

			const callArgs = mockFetch.mock.calls[0][1];
			expect(callArgs.method).toBe('POST');
			expect(callArgs.headers['Content-Type']).toBe('application/json');
			expect(callArgs.headers.Authorization).toBe('Basic ' + btoa('public-key:secret-key'));
		});

		it('handles optional params being undefined', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.finalizeTrace({ traceId: 'trace-1' });

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body);

			expect(body.batch[0].body.output).toBeUndefined();
			expect(body.batch[0].body.metadata).toBeUndefined();
		});

		it('does not include name in upsert body', async () => {
			const service = new LangfuseService('public-key', 'secret-key');

			await service.finalizeTrace({
				traceId: 'trace-1',
				output: 'result',
			});

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body);

			expect(body.batch[0].body.name).toBeUndefined();
		});

		it('logs error when API call fails', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			mockFetch.mockResolvedValueOnce({ ok: false, status: 403, statusText: 'Forbidden' });

			const service = new LangfuseService('public-key', 'secret-key');
			await service.finalizeTrace({ traceId: 'trace-1' });

			expect(consoleSpy).toHaveBeenCalledWith('Langfuse ingestion failed: 403 Forbidden');
			consoleSpy.mockRestore();
		});
	});
});
