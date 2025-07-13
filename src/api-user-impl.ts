import { HttpApiBuilder } from '@effect/platform';
import { ConduitApi } from './api';
import { Effect } from 'effect';
import { CurrentUser } from './authentication';
import { generateJWT } from './jwt';
import { GenericError } from './shared';
import { SqlClient } from '@effect/sql';
import { InternalServerError } from '@effect/platform/HttpApiError';
import type { User } from './api-user';
import { hashPassword } from './password';

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
				// TODO: 実際のデータベースでメール・パスワード検証
				// const dbUser = yield* userRepository.findByEmail(payload.user.email);
				// const isValid = yield* verifyPassword(payload.user.password, dbUser.passwordHash);

				// スタブとしてサンプルユーザーを返す
				const userInfo = {
					id: '1',
					username: 'john_doe',
					email: payload.user.email,
				};

				// JWTトークンを生成
				const token = yield* generateJWT(userInfo).pipe(Effect.mapError(() => new GenericError()));

				return {
					user: {
						bio: 'I work at statefarm',
						email: userInfo.email,
						image: 'https://i.stack.imgur.com/xHWG8.jpg',
						token,
						username: userInfo.username,
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
