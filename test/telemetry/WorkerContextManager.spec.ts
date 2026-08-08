import { WorkerContextManager } from '@/telemetry/WorkerContextManager';
import { context, createContextKey, ROOT_CONTEXT } from '@opentelemetry/api';
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { describe, expect, it } from 'vitest';

const TEST_KEY = createContextKey('worker-context-manager-test');

describe('WorkerContextManager', () => {
	it('should return the root context when nothing is active', () => {
		const manager = new WorkerContextManager();

		expect(manager.active()).toBe(ROOT_CONTEXT);
	});

	it('should expose the given context while the callback runs', () => {
		const manager = new WorkerContextManager();
		const scoped = ROOT_CONTEXT.setValue(TEST_KEY, 'scoped');

		const seen = manager.with(scoped, () => manager.active());

		expect(seen).toBe(scoped);
	});

	it('should restore the outer context after the callback returns', () => {
		const manager = new WorkerContextManager();
		const scoped = ROOT_CONTEXT.setValue(TEST_KEY, 'scoped');

		manager.with(scoped, () => manager.active());

		expect(manager.active()).toBe(ROOT_CONTEXT);
	});

	it('should forward arguments and receiver to the callback', () => {
		const manager = new WorkerContextManager();
		const receiver = { label: 'receiver' };

		const result = manager.with(
			ROOT_CONTEXT,
			function (this: typeof receiver, suffix: string) {
				return `${this.label}:${suffix}`;
			},
			receiver,
			'argument',
		);

		expect(result).toBe('receiver:argument');
	});

	it('should return non-function targets unchanged when binding', () => {
		const manager = new WorkerContextManager();
		const target = { plain: true };

		expect(manager.bind(ROOT_CONTEXT, target)).toBe(target);
	});

	it('should replay the bound context when the bound function is called later', () => {
		const manager = new WorkerContextManager();
		const scoped = ROOT_CONTEXT.setValue(TEST_KEY, 'bound');

		const bound = manager.bind(scoped, () => manager.active().getValue(TEST_KEY));

		expect(bound()).toBe('bound');
	});

	it('should nest spans under the active span so AI SDK generations join the same trace', async () => {
		context.setGlobalContextManager(new WorkerContextManager());
		const exporter = new InMemorySpanExporter();
		const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
		const tracer = provider.getTracer('test');

		tracer.startActiveSpan('root', (root) => {
			tracer.startSpan('child').end();
			root.end();
		});
		await provider.forceFlush();

		const spans = exporter.getFinishedSpans();
		const root = spans.find((span) => span.name === 'root');
		const child = spans.find((span) => span.name === 'child');
		expect(child?.parentSpanContext?.spanId).toBe(root?.spanContext().spanId);
	});
});
