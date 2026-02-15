import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from '@/service/Logger';

describe('Logger', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('outputs info level via console.log with required fields', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const logger = new Logger('TestComponent');

		logger.info('test message');

		expect(spy).toHaveBeenCalledWith({
			level: 'info',
			message: 'test message',
			component: 'TestComponent',
		});
	});

	it('outputs debug level via console.log with required fields', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const logger = new Logger('TestComponent');

		logger.debug('debug message');

		expect(spy).toHaveBeenCalledWith({
			level: 'debug',
			message: 'debug message',
			component: 'TestComponent',
		});
	});

	it('outputs warn level via console.warn with required fields', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const logger = new Logger('TestComponent');

		logger.warn('warn message');

		expect(spy).toHaveBeenCalledWith({
			level: 'warn',
			message: 'warn message',
			component: 'TestComponent',
		});
	});

	it('outputs error level via console.error with required fields', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const logger = new Logger('TestComponent');

		logger.error('error message');

		expect(spy).toHaveBeenCalledWith({
			level: 'error',
			message: 'error message',
			component: 'TestComponent',
		});
	});

	it('includes optional fields in the output', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const logger = new Logger('TestComponent');

		logger.info('with fields', { issueId: 42, url: 'https://example.com' });

		expect(spy).toHaveBeenCalledWith({
			level: 'info',
			message: 'with fields',
			component: 'TestComponent',
			issueId: 42,
			url: 'https://example.com',
		});
	});

	it('uses the component name from constructor', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const logger = new Logger('MyService');

		logger.error('something failed');

		expect(spy).toHaveBeenCalledWith(
			expect.objectContaining({ component: 'MyService' }),
		);
	});
});
