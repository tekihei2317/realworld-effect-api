import { HttpApiBuilder } from '@effect/platform';
import { ConduitApi } from './api';
import { Effect } from 'effect';

export const usersLive = HttpApiBuilder.group(ConduitApi, 'Users', (handlers) =>
	handlers.handle('getCurrentUser', () => Effect.succeed(undefined)),
);
