import { HttpApiBuilder, HttpServer, HttpApiSwagger } from '@effect/platform';
import { Layer } from 'effect';
import { ConduitApi } from './api';
import { tagsLive } from './api-tag-impl';
import { usersLive } from './api-user-impl';

const ConduitApiLive = HttpApiBuilder.api(ConduitApi).pipe(
	Layer.provide(tagsLive),
	Layer.provide(usersLive),
);

const SwaggerLive = HttpApiSwagger.layer().pipe(Layer.provide(ConduitApiLive));

export const { handler, dispose } = HttpApiBuilder.toWebHandler(
	Layer.mergeAll(ConduitApiLive, SwaggerLive, HttpServer.layerContext),
);
