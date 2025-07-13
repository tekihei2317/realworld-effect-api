import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { testWebHandler } from './api-test-utils';

describe('Tags API', () => {
	it('タグ一覧を取得できること', async () => {
		const test = Effect.gen(function* () {
			const handler = yield* testWebHandler;

			const request = new Request('http://localhost/tags');
			const response = yield* Effect.promise(() => handler.handler(request));

			expect(response.status).toBe(200);

			const data = yield* Effect.promise(() => response.json());
			expect(data).toHaveProperty('tags');
		});

		await Effect.runPromise(Effect.scoped(test));
	});
});
