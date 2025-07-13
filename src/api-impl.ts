import { HttpApiBuilder, HttpServer, HttpApiSwagger } from '@effect/platform';
import { Layer } from 'effect';
import { ConduitApi } from './api';
import { tagsLive } from './api-tag-impl';
import { usersLive } from './api-user-impl';
import { D1Client } from '@effect/sql-d1';
import { AuthorizationLive } from './authentication';

export function createWebHandler({
	db,
}: {
	db: D1Database;
}): ReturnType<typeof HttpApiBuilder.toWebHandler> {
	const SqlLive = D1Client.layer({ db });
	const ConduitApiLive = HttpApiBuilder.api(ConduitApi).pipe(
		Layer.provide(tagsLive),
		Layer.provide(usersLive),
		Layer.provide(AuthorizationLive),
		Layer.provide(SqlLive),
	);

	const SwaggerLive = HttpApiSwagger.layer().pipe(Layer.provide(ConduitApiLive));

	return HttpApiBuilder.toWebHandler(
		Layer.mergeAll(ConduitApiLive, SwaggerLive, HttpServer.layerContext),
	);
}
