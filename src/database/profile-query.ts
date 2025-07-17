import { SqlClient, SqlSchema } from '@effect/sql';
import { Effect, Option, pipe, Schema } from 'effect';
import { testSqlClient } from '../api/api-test-utils';
import { GenericError } from '../api/shared';

const Profile = Schema.Struct({
  username: Schema.String,
  bio: Schema.NullOr(Schema.String),
  image: Schema.NullOr(Schema.String),
  following: Schema.Boolean,
});

/**
 * ユーザーのプロフィールをユーザー名で取得する
 */
export const getProfile = ({ username }: { username: string }) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const query = SqlSchema.findOne({
      Request: Schema.Struct({ username: Schema.String }),
      Result: Profile.omit('following'),
      execute: ({ username }) =>
        sql`select username, bio, profileImageUrl as image from User where username = ${username}`,
    });
    const profileWithoutIsFollowing = yield* query({ username });

    // TODO: ログインユーザーがフォローしているかどうかを取得する
    const following = false;
    return Option.map(profileWithoutIsFollowing, (user) => ({ ...user, following }));
  });

const getIsFollowingQuery = Effect.map(SqlClient.SqlClient, (sql) =>
  SqlSchema.findOne({
    Request: Schema.Struct({ followerId: Schema.Number, followeeId: Schema.Number }),
    Result: Schema.Struct({ isFollowing: Schema.Literal(1) }),
    execute: ({ followerId, followeeId }) =>
      sql`
        select 1 as isFollowing from Follow
        where followerId = ${followerId} and followeeId = ${followeeId}
      `,
  }),
);

/**
 * ユーザーをフォローし、プロフィールを返す
 */
export const followUser = ({
  currentUserId,
  username,
}: {
  currentUserId: number;
  username: string;
}) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    const followees = yield* sql<{ id: number }>`select id from User where username = ${username}`;
    if (followees.length === 0) {
      return yield* new GenericError({ message: 'following user not found' });
    }
    const followee = followees[0];

    // フォローを探す
    const followings = yield* sql<{ followerId: number; followeeId: number }>`
      select followerId, followeeId
      from Follow
      where followerId = ${currentUserId} and followeeId = ${followee.id}
    `;

    if (followings.length === 0) {
      // 未フォローなのでフォローする
      yield* sql`insert into Follow (followerId, followeeId) values (${currentUserId}, ${followee.id})`;
    }

    return yield* getProfile({ username });
  });

/**
 * ユーザーのフォローを解除し、プロフィールを返す
 */
export const unfollowUser = ({
  currentUserId,
  username,
}: {
  currentUserId: number;
  username: string;
}) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    const followees = yield* sql<{ id: number }>`select id from User where username = ${username}`;
    if (followees.length === 0) {
      return yield* new GenericError({ message: 'following user not found' });
    }
    const followee = followees[0];

    // フォローを解除する
    yield* sql`
      delete from Follow
      where followerId = ${currentUserId} and followeeId = ${followee.id}
    `;

    return yield* getProfile({ username });
  });

/**
 * 特定のユーザーが、他のユーザーをフォローしているかを取得する
 */
const getIsFollowing = ({ followerId, followeeId }: { followerId: number; followeeId: number }) =>
  pipe(
    Effect.flatMap(getIsFollowingQuery, (query) => query({ followerId, followeeId })),
    Effect.map((user) => ({ isFollowing: Option.isSome(user) })),
  );

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe('getProfile', () => {
    it('プロフィールを取得できること', async () => {
      const test = Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const user = (yield* sql<{
          id: number;
          username: string;
        }>`insert into User (username) values ('user1') returning id, username`)[0];

        const profile = yield* getProfile({ username: user.username });

        expect(Option.getOrNull(profile)).toEqual({
          username: user.username,
          bio: null,
          image: null,
          following: false,
        });
      });

      await Effect.runPromise(
        Effect.scoped(test.pipe(Effect.provideServiceEffect(SqlClient.SqlClient, testSqlClient))),
      );
    });
  });

  describe('getIsFollowing', () => {
    it('フォローしている場合はtrueになること', async () => {
      const test = Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        const user1 = (yield* sql<{
          id: number;
        }>`insert into User (username) values ('user1') returning id`)[0];
        const user2 = (yield* sql<{
          id: number;
        }>`insert into User (username) values ('user2') returning id`)[0];
        yield* sql`insert into Follow (followerId, followeeId) values (${user1.id}, ${user2.id})`;

        const result = yield* getIsFollowing({
          followerId: user1.id,
          followeeId: user2.id,
        });
        expect(result.isFollowing).toBe(true);
      });

      await Effect.runPromise(
        Effect.scoped(test.pipe(Effect.provideServiceEffect(SqlClient.SqlClient, testSqlClient))),
      );
    });

    it('フォローしていない場合はfalseになること', async () => {
      const test = Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        const user1 = (yield* sql<{
          id: number;
        }>`insert into User (username) values ('user1') returning id`)[0];
        const user2 = (yield* sql<{
          id: number;
        }>`insert into User (username) values ('user2') returning id`)[0];

        const result = yield* getIsFollowing({
          followerId: user1.id,
          followeeId: user2.id,
        });
        expect(result.isFollowing).toBe(false);
      });

      await Effect.runPromise(
        Effect.scoped(test.pipe(Effect.provideServiceEffect(SqlClient.SqlClient, testSqlClient))),
      );
    });
  });
}
