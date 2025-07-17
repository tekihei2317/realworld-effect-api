import { HttpApiBuilder } from '@effect/platform';
import { ConduitApi } from './schema';
import { Effect, Option } from 'effect';
import { followUser, getProfile, unfollowUser } from '../database/profile-query';
import { GenericError } from './shared';
import { CurrentUser } from '../authentication';

export const profileLive = HttpApiBuilder.group(ConduitApi, 'Profile', (handlers) =>
  handlers
    .handle('getProfile', (request) =>
      Effect.gen(function* () {
        const profileOption = yield* getProfile({ username: request.path.username });

        const profile = Option.getOrThrowWith(
          profileOption,
          () => new GenericError({ message: 'user not found' }),
        );

        return { profile };
      }).pipe(
        Effect.mapError((error) => {
          if (error._tag === 'SqlError')
            return new GenericError({ message: 'Database error occured' });
          if (error._tag === 'ParseError')
            return new GenericError({ message: 'Parse error occured' });
          return error;
        }),
      ),
    )
    .handle('followUser', (request) =>
      Effect.gen(function* () {
        const currentUser = yield* CurrentUser;
        const profileOption = yield* followUser({
          currentUserId: Number(currentUser.id),
          username: request.path.username,
        });
        const profile = Option.getOrThrowWith(
          profileOption,
          () => new GenericError({ message: 'user not found' }),
        );

        return { profile };
      }).pipe(
        Effect.mapError((error) => {
          if (error._tag === 'SqlError')
            return new GenericError({ message: 'Database error occured' });
          if (error._tag === 'ParseError')
            return new GenericError({ message: 'Parse error occured' });
          return error;
        }),
      ),
    )
    .handle('unfollowUser', (request) =>
      Effect.gen(function* () {
        const currentUser = yield* CurrentUser;
        const profileOption = yield* unfollowUser({
          currentUserId: Number(currentUser.id),
          username: request.path.username,
        });
        const profile = Option.getOrThrowWith(
          profileOption,
          () => new GenericError({ message: 'user not found' }),
        );

        return { profile };
      }).pipe(
        Effect.mapError((error) => {
          if (error._tag === 'SqlError')
            return new GenericError({ message: 'Database error occured' });
          if (error._tag === 'ParseError')
            return new GenericError({ message: 'Parse error occured' });
          return error;
        }),
      ),
    ),
);
