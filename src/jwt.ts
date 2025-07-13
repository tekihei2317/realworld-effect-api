import { SignJWT, jwtVerify, errors } from 'jose';
import { Effect, Schema } from 'effect';

// JWT秘密鍵（本来は環境変数から取得）
const JWT_SECRET = new TextEncoder().encode('your-super-secret-jwt-key-change-this-in-production');

// JWTペイロードの型定義
export const JWTPayload = Schema.Struct({
	sub: Schema.String, // ユーザーID
	username: Schema.String,
	email: Schema.String,
	iat: Schema.Number, // 発行時刻
	exp: Schema.Number, // 有効期限
});

export type JWTPayload = Schema.Schema.Type<typeof JWTPayload>;

// ユーザー情報の型
export const UserInfo = Schema.Struct({
	id: Schema.String,
	username: Schema.String,
	email: Schema.String,
});

export type UserInfo = Schema.Schema.Type<typeof UserInfo>;

// JWT生成
export const generateJWT = (userInfo: UserInfo): Effect.Effect<string, Error> =>
	Effect.tryPromise({
		try: async () => {
			const now = Math.floor(Date.now() / 1000);
			const exp = now + 60 * 60; // 1時間後に期限切れ

			return await new SignJWT({
				sub: userInfo.id,
				username: userInfo.username,
				email: userInfo.email,
			})
				.setProtectedHeader({ alg: 'HS256' })
				.setIssuedAt(now)
				.setExpirationTime(exp)
				.sign(JWT_SECRET);
		},
		catch: (error) => new Error(`JWT generation failed: ${error}`),
	});

// JWT検証
export const verifyJWT = (token: string): Effect.Effect<JWTPayload, Error> =>
	Effect.tryPromise({
		try: async () => {
			const { payload } = await jwtVerify(token, JWT_SECRET);

			// ペイロードの型検証
			return Schema.decodeUnknownSync(JWTPayload)(payload);
		},
		catch: (error) => {
			if (error instanceof errors.JWTExpired) {
				return new Error('JWT token has expired');
			}
			if (error instanceof errors.JWTInvalid) {
				return new Error('JWT token is invalid');
			}
			return new Error(`JWT verification failed: ${error}`);
		},
	});
