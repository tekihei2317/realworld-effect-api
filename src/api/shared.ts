import { Schema } from 'effect';

export class GenericError extends Schema.TaggedError<GenericError>()('GenericError', {
  message: Schema.String,
}) {}
