// test/index.spec.ts
import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('GET /', () => {
	it('responds with Ruby Information Bot', async () => {
		const response = await SELF.fetch('https://example.com');
		expect(await response.text()).toMatchInlineSnapshot(`"Ruby Information Bot"`);
	});
});
