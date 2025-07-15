import { Effect } from 'effect';
import * as bcrypt from 'bcryptjs';

// パスワードハッシュ化
export const hashPassword = (password: string): Effect.Effect<string, Error> =>
	Effect.tryPromise({
		try: async () => {
			// テスト環境では低いroundsを使用してパフォーマンスを向上
			const saltRounds = process.env.NODE_ENV === 'test' ? 4 : 12;
			return await bcrypt.hash(password, saltRounds);
		},
		catch: (error) => new Error(`Password hashing failed: ${error}`),
	});

// パスワード検証
export const verifyPassword = (
	password: string,
	hashedPassword: string,
): Effect.Effect<boolean, Error> =>
	Effect.tryPromise({
		try: async () => {
			return await bcrypt.compare(password, hashedPassword);
		},
		catch: (error) => new Error(`Password verification failed: ${error}`),
	});
