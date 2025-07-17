import { SqlClient, SqlSchema } from '@effect/sql';
import { Effect, Option, pipe, Schema } from 'effect';
import { testSqlClient } from '../api/api-test-utils';

const Profile = Schema.Struct({
  username: Schema.String,
  bio: Schema.String,
  image: Schema.String,
  following: Schema.Boolean,
});

/**
 * ユーザーのプロフィールをユーザー名で取得する
 */
export const getProfile = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const query = SqlSchema.findOne({
    Request: Schema.Struct({ username: Schema.String }),
    Result: Profile.omit('following'),
    execute: ({ username }) =>
      sql`select username, bio, profileImageUrl as image from User where username = ${username}`,
  });

  return query;
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
 * 特定のユーザーが、他のユーザーをフォローしているかを取得する
 */
const getIsFollowing = ({ followerId, followeeId }: { followerId: number; followeeId: number }) =>
  pipe(
    Effect.flatMap(getIsFollowingQuery, (query) => query({ followerId, followeeId })),
    Effect.map((user) => ({ isFollowing: Option.isSome(user) })),
  );

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

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
