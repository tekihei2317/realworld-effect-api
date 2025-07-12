import { HttpApiMiddleware, HttpApiSchema, HttpApiSecurity } from '@effect/platform';
import { Context, Effect, Layer, Redacted, Schema } from 'effect';

export class GenericError extends Schema.TaggedError<GenericError>()('GenericError', {}) {}

class Unauthorized extends Schema.TaggedError<Unauthorized>()(
	'Unauthorized',
	{},
	HttpApiSchema.annotations({ status: 401 }),
) {}

// const User = Schema.Struct({
// 	// bio: Schema.String,
// 	// email: Schema.String,
// 	// image: Schema.String,
// 	// token: Schema.String,
// 	// username: Schema.String,
// 	id: Schema.Number,
// });

class User extends Schema.Class<User>('User')({ id: Schema.Number }) {}

export class CurrentUser extends Context.Tag('CurrentUser')<CurrentUser, User>() {}

export class Authorization extends HttpApiMiddleware.Tag<Authorization>()('Authorization', {
	failure: Unauthorized,
	provides: CurrentUser,
	security: {
		token: HttpApiSecurity.bearer,
	},
}) {}

export const AuthorizationLive = Layer.effect(
	Authorization,
	Effect.gen(function* () {
		yield* Effect.log('creating Authorization middleware');

		return {
			token: (bearerToken) =>
				Effect.gen(function* () {
					yield* Effect.log('checking bearer token', Redacted.value(bearerToken));

					return new User({ id: 1 });
				}),
		};
	}),
);
