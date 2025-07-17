import { HttpApiBuilder } from '@effect/platform';
import { ConduitApi } from './schema';

export const profileLive = HttpApiBuilder.group(ConduitApi, 'Profile', (handlers) =>
  handlers.handle(),
);
