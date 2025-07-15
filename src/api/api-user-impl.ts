import { HttpApiBuilder } from '@effect/platform';
import { ConduitApi } from './schema';
import { Effect } from 'effect';
import { CurrentUser } from '../authentication';
import { generateJWT } from '../jwt';
import { GenericError } from './shared';
import { SqlClient } from '@effect/sql';
import type { NewUserRequest, User, LoginUserRequest, UpdateUserRequest } from './schema/api-user';
import { hashPassword, verifyPassword } from '../password';

const getCurrentUser = () =>
  Effect.gen(function* () {
    const user = yield* CurrentUser;

    // 新しいJWTトークンを生成（リフレッシュ）
    const token = yield* generateJWT({
      id: user.id,
      username: user.username,
      email: user.email,
    }).pipe(Effect.mapError(() => new GenericError({ message: 'jwt generation failed' })));

    const sql = yield* SqlClient.SqlClient;
    const users = yield* sql<{
      bio: string;
      image: string;
    }>`select bio, profileImageUrl as image from User where id = ${user.id}`;

    if (users[0] === undefined) {
      // TODO: システムエラーにする
      yield* new GenericError({ message: `User record with id = ${user.id} does not exist` });
    }

    return {
      user: {
        bio: users[0].bio,
        email: user.email,
        image: users[0].image,
        token,
        username: user.username,
      },
    };
  }).pipe(
    Effect.mapError((error) => {
      if (error._tag === 'SqlError') return new GenericError({ message: 'Database error occured' });
      return error;
    }),
  );
const login = ({ payload }: { payload: LoginUserRequest }) =>
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
		`.pipe(Effect.mapError(() => new GenericError({ message: 'Database error occured' })));

    if (userResult.length === 0) {
      yield* Effect.fail(new GenericError({ message: 'email or password is invalid' }));
    }

    const dbUser = userResult[0];

    // パスワード検証
    const isValid = yield* verifyPassword(payload.user.password, dbUser.passwordHash).pipe(
      Effect.mapError(() => new GenericError({ message: 'password verification failed' })),
    );

    if (!isValid) {
      yield* Effect.fail(new GenericError({ message: 'email or password is invalid' }));
    }

    // JWT生成
    const token = yield* generateJWT({
      id: dbUser.id.toString(),
      username: dbUser.username,
      email: dbUser.email,
    }).pipe(Effect.mapError(() => new GenericError({ message: 'jwt generation failed' })));

    return {
      user: {
        bio: dbUser.bio || '',
        email: dbUser.email,
        image: dbUser.profileImageUrl || '',
        token,
        username: dbUser.username,
      },
    };
  });

const createUser = ({ payload }: { payload: NewUserRequest }) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    // ユーザー名の重複チェック
    const usersByUsername = yield* sql`select id from User where username = ${payload.username}`;
    if (usersByUsername.length > 0) {
      yield* new GenericError({ message: 'Username is already used' });
    }

    // メールアドレスの重複チェック
    const usersByEmail = yield* sql`select userId from Auth where email = ${payload.email}`;
    if (usersByEmail.length > 0) {
      yield* new GenericError({ message: 'Email is already used' });
    }

    const passwordHash = yield* hashPassword(payload.password).pipe(
      Effect.mapError(() => new GenericError({ message: 'Password hashing failed' })),
    );

    const userResult = yield* sql<{ id: number }>`
			INSERT INTO User (username) VALUES (${payload.username})
			RETURNING id
		`;

    const userId = userResult[0].id;

    yield* sql`
			INSERT INTO Auth (userId, email, passwordHash)
			VALUES (${userId}, ${payload.email}, ${passwordHash})
		`;

    const token = yield* generateJWT({
      id: userId.toString(),
      username: payload.username,
      email: payload.email,
    }).pipe(Effect.mapError(() => new GenericError({ message: 'jwt generation failed' })));

    const user: User = {
      username: payload.username,
      email: payload.email,
      bio: '',
      image: '',
      token,
    };

    return { user };
  }).pipe(
    Effect.mapError((error) => {
      if (error._tag === 'SqlError') return new GenericError({ message: 'Database error occured' });
      return error;
    }),
  );

const updateCurrentUser = ({ payload }: { payload: UpdateUserRequest }) =>
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
  });

export const usersLive = HttpApiBuilder.group(ConduitApi, 'Users', (handlers) =>
  handlers
    .handle('getCurrentUser', getCurrentUser)
    .handle('login', login)
    .handle('createUser', createUser)
    .handle('updateCurrentUser', updateCurrentUser),
);
