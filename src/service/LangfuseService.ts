import { Logger } from './Logger';

const logger = new Logger('LangfuseService');

export interface GenerationUsage {
	inputTokens?: number;
	outputTokens?: number;
}

export interface CreateTraceParams {
	id: string;
	name: string;
	input?: unknown;
	metadata?: Record<string, unknown>;
	tags?: string[];
}

export interface CreateSpanParams {
	id: string;
	traceId: string;
	name: string;
	startTime: Date;
	endTime: Date;
	input?: unknown;
	output?: unknown;
	metadata?: Record<string, unknown>;
}

export interface FinalizeTraceParams {
	traceId: string;
	output?: unknown;
	metadata?: Record<string, unknown>;
}

export interface TraceGenerationParams {
	traceId: string;
	traceName: string;
	generationId: string;
	model: string;
	input: string;
	output: string;
	startTime: Date;
	endTime: Date;
	usage?: GenerationUsage;
	metadata?: Record<string, unknown>;
}

export interface CreateGenerationParams {
	generationId: string;
	traceId: string;
	model: string;
	input: string;
	output: string;
	startTime: Date;
	endTime: Date;
	usage?: GenerationUsage;
	metadata?: Record<string, unknown>;
}

export class LangfuseService {
	private readonly baseUrl: string;
	private readonly authHeader: string;

	constructor(
		publicKey: string,
		secretKey: string,
		baseUrl: string = 'https://cloud.langfuse.com'
	) {
		this.baseUrl = baseUrl;
		this.authHeader = 'Basic ' + btoa(`${publicKey}:${secretKey}`);
	}

	async traceGeneration(params: TraceGenerationParams): Promise<void> {
		const now = new Date().toISOString();

		const batch = [
			{
				id: crypto.randomUUID(),
				timestamp: now,
				type: 'trace-create',
				body: {
					id: params.traceId,
					name: params.traceName,
					metadata: params.metadata,
				},
			},
			{
				id: crypto.randomUUID(),
				timestamp: now,
				type: 'generation-create',
				body: {
					id: params.generationId,
					traceId: params.traceId,
					name: 'llm-call',
					model: params.model,
					input: params.input,
					output: params.output,
					startTime: params.startTime.toISOString(),
					endTime: params.endTime.toISOString(),
					usage: params.usage
						? {
								input: params.usage.inputTokens,
								output: params.usage.outputTokens,
							}
						: undefined,
				},
			},
		];

		await this.ingest(batch);
	}

	/**
	 * Creates a generation event under an existing Trace in Langfuse.
	 */
	async createGeneration(params: CreateGenerationParams): Promise<void> {
		const batch = [
			{
				id: crypto.randomUUID(),
				timestamp: new Date().toISOString(),
				type: 'generation-create',
				body: {
					id: params.generationId,
					traceId: params.traceId,
					name: 'llm-call',
					model: params.model,
					input: params.input,
					output: params.output,
					startTime: params.startTime.toISOString(),
					endTime: params.endTime.toISOString(),
					usage: params.usage
						? {
								input: params.usage.inputTokens,
								output: params.usage.outputTokens,
							}
						: undefined,
					metadata: params.metadata,
				},
			},
		];

		await this.ingest(batch);
	}

	/**
	 * Creates a new Trace in Langfuse.
	 */
	async createTrace(params: CreateTraceParams): Promise<void> {
		const batch = [
			{
				id: crypto.randomUUID(),
				timestamp: new Date().toISOString(),
				type: 'trace-create',
				body: {
					id: params.id,
					name: params.name,
					input: params.input,
					metadata: params.metadata,
					tags: params.tags,
				},
			},
		];

		await this.ingest(batch);
	}

	/**
	 * Creates a new Span in Langfuse.
	 */
	async createSpan(params: CreateSpanParams): Promise<void> {
		const batch = [
			{
				id: crypto.randomUUID(),
				timestamp: new Date().toISOString(),
				type: 'span-create',
				body: {
					id: params.id,
					traceId: params.traceId,
					name: params.name,
					startTime: params.startTime.toISOString(),
					endTime: params.endTime.toISOString(),
					input: params.input,
					output: params.output,
					metadata: params.metadata,
				},
			},
		];

		await this.ingest(batch);
	}

	/**
	 * Updates an existing Trace in Langfuse (upsert via trace-create).
	 */
	async finalizeTrace(params: FinalizeTraceParams): Promise<void> {
		const batch = [
			{
				id: crypto.randomUUID(),
				timestamp: new Date().toISOString(),
				type: 'trace-create',
				body: {
					id: params.traceId,
					output: params.output,
					metadata: params.metadata,
				},
			},
		];

		await this.ingest(batch);
	}

	private async ingest(batch: unknown[]): Promise<void> {
		const response = await fetch(`${this.baseUrl}/api/public/ingestion`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: this.authHeader,
			},
			body: JSON.stringify({ batch }),
		});

		if (!response.ok) {
			logger.error('Langfuse ingestion failed', { statusCode: response.status });
		}
	}
}
