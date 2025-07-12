import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform';
import { Schema } from 'effect';

const tagsResponse = Schema.Struct({
	tags: Schema.Array(Schema.String),
});

const getTags = HttpApiEndpoint.get('getTags', '/tags').addSuccess(tagsResponse);

export const tagsGroup = HttpApiGroup.make('Tags').add(getTags);
