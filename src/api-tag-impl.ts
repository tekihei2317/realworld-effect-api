import { HttpApiBuilder } from '@effect/platform';
import { ConduitApi } from './api';
import { Effect } from 'effect';

export const tagsLive = HttpApiBuilder.group(ConduitApi, 'Tags', (handlers) =>
	handlers.handle('getTags', () => Effect.succeed({ tags: [] })),
);
