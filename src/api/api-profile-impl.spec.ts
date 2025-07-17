import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { testSqlClient, testWebHandler } from './api-test-utils';
import { SqlClient } from '@effect/sql';
import { generateJWT } from '../jwt';

type ErrorResponse = { message: string };

describe('getProfile', () => {
  it('プロフィールを取得できること', async () => {
    const testProgram = Effect.gen(function* () {
      const sql = yield* testSqlClient;
      const handler = yield* testWebHandler.pipe(Effect.provideService(SqlClient.SqlClient, sql));
      yield* sql`INSERT INTO User (id, username, bio, profileImageUrl) VALUES (1, 'testuser', 'test bio', 'https://example.com/image.jpg')`;
      const request = new Request('http://localhost/profiles/testuser', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = yield* Effect.promise(() => handler.handler(request));
      const data = yield* Effect.promise(() => response.json());

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        profile: {
          username: 'testuser',
          bio: 'test bio',
          image: 'https://example.com/image.jpg',
          following: false,
        },
      });
    });

    await Effect.runPromise(Effect.scoped(testProgram));
  });

  it('存在しないユーザーの場合は422エラーが返ること', async () => {
    const testProgram = Effect.gen(function* () {
      const sql = yield* testSqlClient;
      const handler = yield* testWebHandler.pipe(Effect.provideService(SqlClient.SqlClient, sql));
      const request = new Request('http://localhost/profiles/nonexistent', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = yield* Effect.promise(() => handler.handler(request));
      const data = yield* Effect.promise(() => response.json());

      expect(response.status).toBe(422);
      expect((data as ErrorResponse).message).toBe('User not found');
    });

    await Effect.runPromise(Effect.scoped(testProgram));
  });

  it.skip('ログイン済みユーザーがフォロー中のユーザーのプロフィールを取得した場合、followingがtrueになること', async () => {});
});

describe('followUser', () => {
  it('ユーザーをフォローできること', async () => {
    const testProgram = Effect.gen(function* () {
      const sql = yield* testSqlClient;
      const handler = yield* testWebHandler.pipe(Effect.provideService(SqlClient.SqlClient, sql));
      yield* sql`INSERT INTO User (id, username, bio, profileImageUrl) VALUES (1, 'currentuser', 'current user bio', '')`;
      yield* sql`INSERT INTO User (id, username, bio, profileImageUrl) VALUES (2, 'targetuser', 'target user bio', '')`;

      const token = yield* generateJWT({
        id: '1',
        username: 'currentuser',
        email: 'current@example.com',
      });
      const request = new Request('http://localhost/profiles/targetuser/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
      });

      const response = yield* Effect.promise(() => handler.handler(request));
      const data = yield* Effect.promise(() => response.json());

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        profile: {
          username: 'targetuser',
          bio: 'target user bio',
          image: '',
          // TODO:
          following: false,
        },
      });
    });

    await Effect.runPromise(Effect.scoped(testProgram));
  });

  it('存在しないユーザーをフォローしようとした場合は422エラーが返ること', async () => {
    const testProgram = Effect.gen(function* () {
      const sql = yield* testSqlClient;
      const handler = yield* testWebHandler.pipe(Effect.provideService(SqlClient.SqlClient, sql));
      yield* sql`INSERT INTO User (id, username, bio, profileImageUrl) VALUES (1, 'currentuser', 'current user bio', '')`;

      const token = yield* generateJWT({
        id: '1',
        username: 'currentuser',
        email: 'current@example.com',
      });
      const request = new Request('http://localhost/profiles/nonexistent/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
      });

      const response = yield* Effect.promise(() => handler.handler(request));
      const data = yield* Effect.promise(() => response.json());

      expect(response.status).toBe(422);
      expect((data as ErrorResponse).message).toBe('User not found');
    });

    await Effect.runPromise(Effect.scoped(testProgram));
  });

  it('認証なしでフォローしようとした場合は401エラーが返ること', async () => {
    const testProgram = Effect.gen(function* () {
      const sql = yield* testSqlClient;
      const handler = yield* testWebHandler.pipe(Effect.provideService(SqlClient.SqlClient, sql));
      yield* sql`INSERT INTO User (id, username, bio, profileImageUrl) VALUES (1, 'targetuser', 'target user bio', '')`;

      const request = new Request('http://localhost/profiles/targetuser/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const response = yield* Effect.promise(() => handler.handler(request));
      const data = yield* Effect.promise(() => response.json());

      expect(response.status).toBe(401);
      expect(data).toEqual({ _tag: 'Unauthorized' });
    });

    await Effect.runPromise(Effect.scoped(testProgram));
  });
});

describe('unfollowUser', () => {
  it('ユーザーをアンフォローできること', async () => {
    const testProgram = Effect.gen(function* () {
      const sql = yield* testSqlClient;
      const handler = yield* testWebHandler.pipe(Effect.provideService(SqlClient.SqlClient, sql));

      yield* sql`INSERT INTO User (id, username, bio, profileImageUrl) VALUES (1, 'currentuser', 'current user bio', '')`;
      yield* sql`INSERT INTO User (id, username, bio, profileImageUrl) VALUES (2, 'targetuser', 'target user bio', '')`;
      yield* sql`INSERT INTO Follow (followerId, followeeId) VALUES (1, 2)`;

      const token = yield* generateJWT({
        id: '1',
        username: 'currentuser',
        email: 'current@example.com',
      });
      const request = new Request('http://localhost/profiles/targetuser', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
      });

      const response = yield* Effect.promise(() => handler.handler(request));
      const data = yield* Effect.promise(() => response.json());

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        profile: {
          username: 'targetuser',
          bio: 'target user bio',
          image: '',
          following: false,
        },
      });
    });

    await Effect.runPromise(Effect.scoped(testProgram));
  });

  it('存在しないユーザーをアンフォローしようとした場合は422エラーが返ること', async () => {
    const testProgram = Effect.gen(function* () {
      const sql = yield* testSqlClient;
      const handler = yield* testWebHandler.pipe(Effect.provideService(SqlClient.SqlClient, sql));
      yield* sql`INSERT INTO User (id, username, bio, profileImageUrl) VALUES (1, 'currentuser', 'current user bio', '')`;

      const token = yield* generateJWT({
        id: '1',
        username: 'currentuser',
        email: 'current@example.com',
      });
      const request = new Request('http://localhost/profiles/nonexistent', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
      });

      const response = yield* Effect.promise(() => handler.handler(request));
      const data = yield* Effect.promise(() => response.json());

      expect(response.status).toBe(422);
      expect((data as ErrorResponse).message).toBe('User not found');
    });

    await Effect.runPromise(Effect.scoped(testProgram));
  });

  it('認証なしでアンフォローしようとした場合は401エラーが返ること', async () => {
    const testProgram = Effect.gen(function* () {
      const sql = yield* testSqlClient;
      const handler = yield* testWebHandler.pipe(Effect.provideService(SqlClient.SqlClient, sql));
      yield* sql`INSERT INTO User (id, username, bio, profileImageUrl) VALUES (1, 'targetuser', 'target user bio', '')`;

      const request = new Request('http://localhost/profiles/targetuser', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = yield* Effect.promise(() => handler.handler(request));
      const data = yield* Effect.promise(() => response.json());

      expect(response.status).toBe(401);
      expect(data).toEqual({ _tag: 'Unauthorized' });
    });

    await Effect.runPromise(Effect.scoped(testProgram));
  });
});
