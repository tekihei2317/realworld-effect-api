import { HttpApiMiddleware, HttpApiSchema, HttpApiSecurity } from '@effect/platform';
import { Context, Effect, Layer, Redacted, Schema } from 'effect';
import { verifyJWT } from './jwt';

export class GenericError extends Schema.TaggedError<GenericError>()('GenericError', {}) {}

class Unauthorized extends Schema.TaggedError<Unauthorized>()(
	'Unauthorized',
	{},
	HttpApiSchema.annotations({ status: 401 }),
) {}

const TokenSecurity = HttpApiSecurity.apiKey({
	key: 'Authorization',
	in: 'header',
});

class User extends Schema.Class<User>('User')({
	id: Schema.String,
	username: Schema.String,
	email: Schema.String,
}) {}

export class CurrentUser extends Context.Tag('CurrentUser')<CurrentUser, User>() {}

export class Authorization extends HttpApiMiddleware.Tag<Authorization>()('Authorization', {
	failure: Unauthorized,
	provides: CurrentUser,
	security: {
		token: TokenSecurity,
	},
}) {}

// JWT検証関数
const validateJWTToken = (token: string): Effect.Effect<User, Unauthorized> =>
	Effect.gen(function* () {
		const payload = yield* verifyJWT(token).pipe(Effect.mapError(() => new Unauthorized()));

		return new User({
			id: payload.sub,
			username: payload.username,
			email: payload.email,
		});
	});

export const AuthorizationLive = Layer.effect(
	Authorization,
	Effect.gen(function* () {
		yield* Effect.log('creating Authorization middleware');

		return {
			token: (authHeader) =>
				Effect.gen(function* () {
					const headerValue = Redacted.value(authHeader);

					// "Token jwt.token.here" から "jwt.token.here" を抽出
					if (!headerValue.startsWith('Token ')) {
						yield* Effect.log('Invalid auth header format, expected "Token <jwt>"');
						yield* Effect.fail(new Unauthorized());
					}

					// JWT検証
					const jwtToken = headerValue.slice(6);
					const user = yield* validateJWTToken(jwtToken);

					return user;
				}),
		};
	}),
);
