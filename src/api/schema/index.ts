import { HttpApi } from '@effect/platform';
import { tagsGroup } from './api-tag';
import { usersGroup } from './api-user';
import { profileGroup } from './api-profile';

export const ConduitApi = HttpApi.make('ConduitApi')
  .add(tagsGroup)
  .add(usersGroup)
  .add(profileGroup);
