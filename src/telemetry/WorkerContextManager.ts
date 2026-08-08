import { ROOT_CONTEXT, type Context, type ContextManager } from '@opentelemetry/api';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * OpenTelemetry context manager backed by the runtime's own AsyncLocalStorage.
 *
 * OTel ships `@opentelemetry/context-async-hooks` for this, but that package is
 * CommonJS-only and resolves its own copy of `@opentelemetry/api`, which leaves
 * `ROOT_CONTEXT` undefined under the Workers test runner. Talking to
 * AsyncLocalStorage directly keeps a single `@opentelemetry/api` instance and
 * costs less than the dependency it replaces.
 */
export class WorkerContextManager implements ContextManager {
	private readonly storage = new AsyncLocalStorage<Context>();

	active(): Context {
		return this.storage.getStore() ?? ROOT_CONTEXT;
	}

	with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
		context: Context,
		fn: F,
		thisArg?: ThisParameterType<F>,
		...args: A
	): ReturnType<F> {
		const callback = thisArg == null ? fn : (fn.bind(thisArg) as F);
		return this.storage.run(context, callback, ...args);
	}

	bind<T>(context: Context, target: T): T {
		if (typeof target !== 'function') return target;

		const { storage } = this;
		const callable = target as (...args: unknown[]) => unknown;
		const bound = function (this: unknown, ...args: unknown[]) {
			return storage.run(context, () => callable.apply(this, args));
		};

		return bound as T;
	}

	enable(): this {
		return this;
	}

	disable(): this {
		this.storage.disable();
		return this;
	}
}
