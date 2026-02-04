export interface GenerationUsage {
	inputTokens?: number;
	outputTokens?: number;
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

		const response = await fetch(`${this.baseUrl}/api/public/ingestion`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: this.authHeader,
			},
			body: JSON.stringify({ batch }),
		});

		if (!response.ok) {
			console.error(`Langfuse ingestion failed: ${response.status} ${response.statusText}`);
		}
	}
}
