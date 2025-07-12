import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform';

const getCurrentUser = HttpApiEndpoint.get('getCurrentUser', '/user');

export const usersGroup = HttpApiGroup.make('Users').add(getCurrentUser);
