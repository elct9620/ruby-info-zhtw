import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

describe('GET /', () => {
	it('responds with Ruby Information Bot', async () => {
		const response = await exports.default.fetch('https://example.com');
		expect(await response.text()).toMatchInlineSnapshot(`"Ruby Information Bot"`);
	});
});
