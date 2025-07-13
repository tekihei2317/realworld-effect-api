import { Effect, Layer } from 'effect';
import { HttpApiBuilder, HttpServer } from '@effect/platform';
import { SqliteClient } from '@effect/sql-sqlite-node';
import { ConduitApi } from '../src/api';
import { tagsLive } from '../src/api-tag-impl';
import { usersLive } from '../src/api-user-impl';
import { AuthorizationLive } from '../src/authentication';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { Reactivity } from '@effect/experimental';
import { SqlClient } from '@effect/sql';

const loadMigration = async () => {
	return fs.readFile(path.resolve(__dirname, '../migrations/0001_init.sql'), 'utf-8');
};

const sqlClient = SqliteClient.make({
	filename: ':memory:',
}).pipe(Effect.provide(Reactivity.layer));

export const testSqlClient = Effect.gen(function* () {
	const sql = yield* sqlClient;
	const migrationSql = yield* Effect.promise(() => loadMigration());

	const statements = migrationSql
		.split(';')
		.map((stmt) => stmt.trim())
		.filter((stmt) => stmt && !stmt.startsWith('--'));

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
