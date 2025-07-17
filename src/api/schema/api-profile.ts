import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform';
import { Schema } from 'effect';
import { GenericError } from '../shared';
import { Authorization } from '../../authentication';

const Profile = Schema.Struct({
  username: Schema.String,
  image: Schema.String,
  bio: Schema.String,
  following: Schema.Boolean,
});

const ProfileResponse = Schema.Struct({
  profile: Profile,
});

const UsernamePath = Schema.Struct({ username: Schema.String });

const getProfile = HttpApiEndpoint.get('getProfile', '/profile/:username')
  .setPath(UsernamePath)
  .addSuccess(ProfileResponse)
  .addError(GenericError, { status: 422 });

const followUser = HttpApiEndpoint.post('followUser', '/profile/:username/follow')
  .setPath(UsernamePath)
  .middleware(Authorization)
  .addSuccess(ProfileResponse)
  .addError(GenericError, { status: 422 });

const unfollowUser = HttpApiEndpoint.del('unfollowUser', '/profile/:username')
  .setPath(UsernamePath)
  .middleware(Authorization)
  .addSuccess(ProfileResponse)
  .addError(GenericError, { status: 422 });

export const profileGroup = HttpApiGroup.make('Profile')
  .add(getProfile)
  .add(followUser)
  .add(unfollowUser);
