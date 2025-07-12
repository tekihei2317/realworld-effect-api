import { HttpApiMiddleware, HttpApiSchema, HttpApiSecurity } from '@effect/platform';
import { Context, Effect, Layer, Redacted, Schema } from 'effect';

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
		token: TokenSecurity,
	},
}) {}

// JWT検証関数（スタブ）
const validateJWTToken = (token: string): Effect.Effect<number, Unauthorized> =>
	Effect.gen(function* () {
		yield* Effect.log('validating JWT token', Redacted.make(token));

		// TODO: 実際のJWT検証を実装
		// - トークンの署名検証
		// - 有効期限チェック
		// - ユーザーIDの抽出

		if (token === 'invalid') {
			yield* Effect.fail(new Unauthorized());
		}

		return 1; // スタブとしてユーザーID=1を返す
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
					const userId = yield* validateJWTToken(jwtToken);

					return new User({ id: userId });
				}),
		};
	}),
);
