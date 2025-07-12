import { HttpApi } from '@effect/platform';
import { tagsGroup } from './api-tag';
import { usersGroup } from './api-user';

export const ConduitApi = HttpApi.make('ConduitApi').add(tagsGroup).add(usersGroup);
