import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { testSqlClient, testWebHandler } from './api-test-utils';
import { SqlClient } from '@effect/sql';

describe('Tags API', () => {
	it('タグ一覧を取得できること', async () => {
		const test = Effect.gen(function* () {
			const sql = yield* testSqlClient;
			const handler = yield* testWebHandler.pipe(Effect.provideService(SqlClient.SqlClient, sql));
			yield* sql`insert into Tag (name) values ('javascript'), ('nodejs')`;

			const request = new Request('http://localhost/tags');
			const response = yield* Effect.promise(() => handler.handler(request));

			expect(response.status).toBe(200);

			const data = yield* Effect.promise(() => response.json());
			expect(data).toHaveProperty('tags');
			expect(data).toMatchObject({ tags: ['javascript', 'nodejs'] });
		});

		await Effect.runPromise(Effect.scoped(test));
	});

	it('タグ一覧を取得できること データベースがリセットされていることを確認', async () => {
		const test = Effect.gen(function* () {
			const sql = yield* testSqlClient;
			const handler = yield* testWebHandler.pipe(Effect.provideService(SqlClient.SqlClient, sql));

			const request = new Request('http://localhost/tags');
			const response = yield* Effect.promise(() => handler.handler(request));

			expect(response.status).toBe(200);
			const data = yield* Effect.promise(() => response.json());
			expect(data).toMatchObject({ tags: [] });
		});

		await Effect.runPromise(Effect.scoped(test));
	});
});
