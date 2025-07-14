import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { testSqlClient, testWebHandler } from './api-test-utils';
import { SqlClient } from '@effect/sql';
import { hashPassword } from '../password';

describe('createUser', () => {
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
			const data = yield* Effect.promise(() => response.json());
			expect((data as { message: string }).message).toBe('Username is already used');
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
			const data = yield* Effect.promise(() => response.json());
			expect((data as { message: string }).message).toBe('Email is already used');
		});

		await Effect.runPromise(Effect.scoped(testProgram));
	});
});

describe('login', () => {
	it('メールアドレスとパスワードが正しい場合はログインできること', async () => {
		const testProgram = Effect.gen(function* () {
			const sql = yield* testSqlClient;
			const handler = yield* testWebHandler.pipe(Effect.provideService(SqlClient.SqlClient, sql));

			yield* sql`INSERT INTO User (username) VALUES ('testuser')`;
			const hashedPassword = yield* hashPassword('password');
			yield* sql`INSERT INTO Auth (userId, email, passwordHash) VALUES (1, 'test@example.com', ${hashedPassword})`;

			const request = new Request('http://localhost/users/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					user: {
						email: 'test@example.com',
						password: 'password',
					},
				}),
			});

			const response = yield* Effect.promise(() => handler.handler(request));
			const data = yield* Effect.promise(() => response.json());
			console.log({ response, data });
			expect(response.status).toBe(200);
		});

		await Effect.runPromise(Effect.scoped(testProgram));
	});

	it('メールアドレスが違う場合はログインできないこと', async () => {
		const testProgram = Effect.gen(function* () {
			const sql = yield* testSqlClient;
			const handler = yield* testWebHandler.pipe(Effect.provideService(SqlClient.SqlClient, sql));

			yield* sql`INSERT INTO User (username) VALUES ('testuser')`;
			const hashedPassword = yield* hashPassword('password');
			yield* sql`INSERT INTO Auth (userId, email, passwordHash) VALUES (1, 'test@example.com', ${hashedPassword})`;

			const request = new Request('http://localhost/users/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					user: {
						email: 'anotheremail@example.com',
						password: 'password',
					},
				}),
			});

			const response = yield* Effect.promise(() => handler.handler(request));
			const data: any = yield* Effect.promise(() => response.json());

			expect(response.status).toBe(422);
			expect(data.message).toBe('email or password is invalid');
		});

		await Effect.runPromise(Effect.scoped(testProgram));
	});

	it('パスワードが違う場合はログインできないこと', async () => {
		const testProgram = Effect.gen(function* () {
			const sql = yield* testSqlClient;
			const handler = yield* testWebHandler.pipe(Effect.provideService(SqlClient.SqlClient, sql));

			yield* sql`INSERT INTO User (username) VALUES ('testuser')`;
			const hashedPassword = yield* hashPassword('password');
			yield* sql`INSERT INTO Auth (userId, email, passwordHash) VALUES (1, 'test@example.com', ${hashedPassword})`;

			const request = new Request('http://localhost/users/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					user: {
						email: 'test@example.com',
						password: 'wrong_password',
					},
				}),
			});

			const response = yield* Effect.promise(() => handler.handler(request));
			const data: any = yield* Effect.promise(() => response.json());

			expect(response.status).toBe(422);
			expect(data.message).toBe('email or password is invalid');
		});

		await Effect.runPromise(Effect.scoped(testProgram));
	});
});
