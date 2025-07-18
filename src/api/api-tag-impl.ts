import { HttpApiBuilder, HttpApiError } from '@effect/platform';
import { ConduitApi } from './schema';
import { Effect } from 'effect';
import { SqlClient } from '@effect/sql';

export const tagsLive = HttpApiBuilder.group(ConduitApi, 'Tags', (handlers) =>
  handlers.handle('getTags', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      const tags = yield* sql<{
        readonly id: number;
        readonly name: string;
      }>`SELECT id, name FROM Tag`.pipe(
        Effect.mapError((error) => {
          console.error('SQL error in getTags:', error);
          return new HttpApiError.InternalServerError();
        }),
      );

      return { tags: tags.map((tag) => tag.name) };
    }),
  ),
);
