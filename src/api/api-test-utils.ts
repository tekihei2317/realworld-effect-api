import { Effect, Layer } from 'effect';
import { HttpApiBuilder, HttpServer } from '@effect/platform';
import { SqliteClient } from '@effect/sql-sqlite-node';
import { Reactivity } from '@effect/experimental';
import { SqlClient } from '@effect/sql';
import * as fs from 'node:fs/promises';
import path from 'node:path';

import { ConduitApi } from './schema';
import { tagsLive } from './api-tag-impl';
import { usersLive } from './api-user-impl';
import { AuthorizationLive } from '../authentication';

const loadMigration = async () => {
	return fs.readFile(path.resolve(__dirname, '../../migrations/0001_init.sql'), 'utf-8');
};

const sqlClient = SqliteClient.make({
	filename: ':memory:',
}).pipe(Effect.provide(Reactivity.layer));

export const testSqlClient = Effect.gen(function* () {
	const sql = yield* sqlClient;
	const migrationSql = yield* Effect.promise(() => loadMigration());
	const statements = migrationSql.split(';').map((stmt) => stmt.trim());

	for (const statement of statements) {
		if (statement) {
			yield* sql.unsafe(statement);
		}
	}
	return sql;
});

export const testWebHandler = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;

	const apiLive = HttpApiBuilder.api(ConduitApi).pipe(
		Layer.provide(tagsLive),
		Layer.provide(usersLive),
		Layer.provide(AuthorizationLive),
		Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
	);

	const webHandler = HttpApiBuilder.toWebHandler(Layer.mergeAll(apiLive, HttpServer.layerContext));

	return webHandler;
});
