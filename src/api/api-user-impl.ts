import { HttpApiBuilder } from '@effect/platform';
import { ConduitApi } from './schema';
import { Effect } from 'effect';
import { CurrentUser } from '../authentication';
import { generateJWT } from '../jwt';
import { GenericError } from './shared';
import { SqlClient } from '@effect/sql';
import type { User } from './schema/api-user';
import { hashPassword, verifyPassword } from '../password';

export const usersLive = HttpApiBuilder.group(ConduitApi, 'Users', (handlers) =>
	handlers
		.handle('getCurrentUser', () =>
			Effect.gen(function* () {
				const user = yield* CurrentUser;

				// 新しいJWTトークンを生成（リフレッシュ）
				const token = yield* generateJWT({
					id: user.id,
					username: user.username,
					email: user.email,
				}).pipe(Effect.mapError(() => new GenericError()));

				return {
					user: {
						bio: 'I work at statefarm',
						email: user.email,
						image: 'https://i.stack.imgur.com/xHWG8.jpg',
						token,
						username: user.username,
					},
				};
			}),
		)
		.handle('login', ({ payload }) =>
			Effect.gen(function* () {
				const sql = yield* SqlClient.SqlClient;

				// メールアドレスでユーザー検索
				const userResult = yield* sql<{
					id: number;
					username: string;
					bio: string | null;
					profileImageUrl: string | null;
					email: string;
					passwordHash: string;
				}>`
					SELECT u.id, u.username, u.bio, u.profileImageUrl, a.email, a.passwordHash
					FROM User u
					JOIN Auth a ON u.id = a.userId
					WHERE a.email = ${payload.user.email}
				`.pipe(Effect.mapError(() => new GenericError()));

				if (userResult.length === 0) {
					yield* Effect.fail(new GenericError());
				}

				const dbUser = userResult[0];

				// パスワード検証
				const isValid = yield* verifyPassword(payload.user.password, dbUser.passwordHash).pipe(
					Effect.mapError(() => new GenericError()),
				);

				if (!isValid) {
					yield* Effect.fail(new GenericError());
				}

				// JWT生成
				const token = yield* generateJWT({
					id: dbUser.id.toString(),
					username: dbUser.username,
					email: dbUser.email,
				}).pipe(Effect.mapError(() => new GenericError()));

				return {
					user: {
						bio: dbUser.bio || '',
						email: dbUser.email,
						image: dbUser.profileImageUrl || '',
						token,
						username: dbUser.username,
					},
				};
			}),
		)
		.handle('createUser', ({ payload }) =>
			Effect.gen(function* () {
				const sql = yield* SqlClient.SqlClient;

				const passwordHash = yield* hashPassword(payload.password).pipe(
					Effect.mapError(() => new GenericError()),
				);

				const userResult = yield* sql<{ id: number }>`
					INSERT INTO User (username) VALUES (${payload.username})
					RETURNING id
				`.pipe(Effect.mapError(() => new GenericError()));

				const userId = userResult[0].id;

				yield* sql`
					INSERT INTO Auth (userId, email, passwordHash)
					VALUES (${userId}, ${payload.email}, ${passwordHash})
				`.pipe(Effect.mapError(() => new GenericError()));

				const token = yield* generateJWT({
					id: userId.toString(),
					username: payload.username,
					email: payload.email,
				}).pipe(Effect.mapError(() => new GenericError()));

				const user: User = {
					username: payload.username,
					email: payload.email,
					bio: '',
					image: '',
					token,
				};

				return { user };
			}),
		)
		.handle('updateCurrentUser', () =>
			Effect.gen(function* () {
				return {
					user: {
						bio: 'bio',
						email: 'email',
						image: 'image',
						token: 'token',
						username: 'username',
					},
				};
			}),
		),
);
