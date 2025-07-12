import { HttpApiBuilder } from '@effect/platform';
import { ConduitApi } from './api';
import { Effect } from 'effect';
import { Authorization, CurrentUser } from './shared';

export const usersLive = HttpApiBuilder.group(ConduitApi, 'Users', (handlers) =>
	handlers
		.handle('getCurrentUser', () =>
			Effect.gen(function* () {
				const user = yield* CurrentUser;

				console.log({ user });

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
		)
		.handle('login', () =>
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
		)
		.handle('createUser', () =>
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
