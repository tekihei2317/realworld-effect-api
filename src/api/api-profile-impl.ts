import { Effect, Option, pipe } from 'effect';
import { HttpApiBuilder } from '@effect/platform';
import { ConduitApi } from './schema';
import { GenericError } from './shared';
import { followUser, getProfile, unfollowUser } from '../database/profile-query';
import { CurrentUser } from '../authentication';
import { ParseError } from 'effect/ParseResult';
import { SqlError } from '@effect/sql/SqlError';

const handleProfileOption = <T>(profileOption: Option.Option<T>) =>
  Option.match(profileOption, {
    onSome: (profile) => Effect.succeed({ profile }),
    onNone: () => Effect.fail(new GenericError({ message: 'User not found' })),
  });

const handleProfileError = (error: SqlError | ParseError | GenericError) => {
  if (error._tag === 'SqlError') return new GenericError({ message: 'Database error occured' });
  if (error._tag === 'ParseError') return new GenericError({ message: 'Parse error occured' });
  return error;
};

export const profileLive = HttpApiBuilder.group(ConduitApi, 'Profile', (handlers) =>
  handlers
    .handle('getProfile', (request) =>
      pipe(
        getProfile({ username: request.path.username }),
        Effect.flatMap(handleProfileOption),
        Effect.mapError(handleProfileError),
      ),
    )
    .handle('followUser', (request) =>
      pipe(
        Effect.flatMap(CurrentUser, (currentUser) =>
          followUser({ currentUserId: Number(currentUser.id), username: request.path.username }),
        ),
        Effect.flatMap(handleProfileOption),
        Effect.mapError(handleProfileError),
      ),
    )
    .handle('unfollowUser', (request) =>
      pipe(
        Effect.flatMap(CurrentUser, (currentUser) =>
          unfollowUser({ currentUserId: Number(currentUser.id), username: request.path.username }),
        ),
        Effect.flatMap(handleProfileOption),
        Effect.mapError(handleProfileError),
      ),
    ),
);
