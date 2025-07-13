import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { testSqlClient, testWebHandler } from './api-test-utils';
import { SqlClient } from '@effect/sql';

describe('User API', () => {
	it('ユーザー登録ができること', async () => {
		const testProgram = Effect.gen(function* () {
			const sql = yield* testSqlClient;
			const handler = yield* testWebHandler.pipe(Effect.provideService(SqlClient.SqlClient, sql));
			const registerRequest = new Request('http://localhost/users', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email: 'test@example.com',
					password: 'password123',
					username: 'testuser',
				}),
			});

			const response = yield* Effect.promise(() => handler.handler(registerRequest));

			expect(response.status).toBe(201);
			const data = yield* Effect.promise(() => response.json());
			expect(data).toMatchObject({
				user: {
					email: 'test@example.com',
					username: 'testuser',
					bio: '',
					image: '',
				},
			});
		});

		await Effect.runPromise(Effect.scoped(testProgram));
	});

	it('ユーザー名が重複している場合422エラーが返ること', async () => {
		const testProgram = Effect.gen(function* () {
			const sql = yield* testSqlClient;
			const handler = yield* testWebHandler.pipe(Effect.provideService(SqlClient.SqlClient, sql));

			yield* sql`INSERT INTO User (username) VALUES ('testuser')`;

			const request = new Request('http://localhost/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'test@example.com',
					password: 'password123',
					username: 'testuser', // duplicate user name
				}),
			});

			const response = yield* Effect.promise(() => handler.handler(request));
			expect(response.status).toBe(422);
		});

		await Effect.runPromise(Effect.scoped(testProgram));
	});

	it('メールアドレスが重複している場合422エラーが返ること', async () => {
		const testProgram = Effect.gen(function* () {
			const sql = yield* testSqlClient;
			const handler = yield* testWebHandler.pipe(Effect.provideService(SqlClient.SqlClient, sql));

			// 既存ユーザーをSQLで直接挿入
			yield* sql`INSERT INTO User (username) VALUES ('existinguser')`;
			yield* sql`INSERT INTO Auth (userId, email, passwordHash) VALUES (1, 'test@example.com', 'hashedpassword')`;

			// 重複したメールアドレスで登録を試行
			const request = new Request('http://localhost/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'test@example.com', // duplicate email
					password: 'password123',
					username: 'newuser',
				}),
			});

			const response = yield* Effect.promise(() => handler.handler(request));
			expect(response.status).toBe(422);
		});

		await Effect.runPromise(Effect.scoped(testProgram));
	});
});
