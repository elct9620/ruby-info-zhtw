import { Telemetry } from '@/telemetry/Telemetry';
import { describe, expect, it } from 'vitest';

const BASE_URL = 'https://langfuse.test';

describe('Telemetry.create', () => {
	it('should return undefined when the public key is missing', () => {
		expect(Telemetry.create({ secretKey: 'sk-test', baseUrl: BASE_URL })).toBeUndefined();
	});

	it('should return undefined when the secret key is missing', () => {
		expect(Telemetry.create({ publicKey: 'pk-test', baseUrl: BASE_URL })).toBeUndefined();
	});

	it('should return undefined when both keys are empty strings', () => {
		expect(Telemetry.create({ publicKey: '', secretKey: '', baseUrl: BASE_URL })).toBeUndefined();
	});

	it('should return a telemetry instance when both keys are present', () => {
		const telemetry = Telemetry.create({ publicKey: 'pk-test', secretKey: 'sk-test', baseUrl: BASE_URL });

		expect(telemetry).toBeDefined();
		expect(telemetry?.tracer).toBeDefined();
		expect(telemetry?.integration).toBeDefined();
	});
});
