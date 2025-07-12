import { HttpApiEndpoint, HttpApiError, HttpApiGroup } from '@effect/platform';
import { Schema } from 'effect';
import { GenericError } from './shared';
import { Authorization } from './authentication';

const LoginUserRequest = Schema.Struct({
	user: Schema.Struct({
		email: Schema.String,
		password: Schema.String,
	}),
});

const User = Schema.Struct({
	bio: Schema.String,
	email: Schema.String,
	image: Schema.String,
	token: Schema.String,
	username: Schema.String,
});

const UserResponse = Schema.Struct({
	user: User,
});

const NewUserRequest = Schema.Struct({
	email: Schema.String,
	password: Schema.String,
	username: Schema.String,
});

const UpdateUserRequest = Schema.partial(
	Schema.Struct({
		email: Schema.String,
		password: Schema.String,
		username: Schema.String,
		bio: Schema.String,
		image: Schema.String,
	}),
);

const login = HttpApiEndpoint.post('login', '/users/login')
	.setPayload(LoginUserRequest)
	.addSuccess(UserResponse)
	.addError(HttpApiError.Unauthorized)
	.addError(GenericError, { status: 422 });

const createUser = HttpApiEndpoint.post('createUser', '/users')
	.setPayload(NewUserRequest)
	.addSuccess(UserResponse, { status: 201 })
	.addError(GenericError, { status: 422 });

const getCurrentUser = HttpApiEndpoint.get('getCurrentUser', '/user')
	.addSuccess(UserResponse)
	.addError(HttpApiError.Unauthorized)
	.addError(GenericError, { status: 422 })
	.middleware(Authorization);

const updateCurrentUser = HttpApiEndpoint.put('updateCurrentUser', '/user')
	.setPayload(UpdateUserRequest)
	.addSuccess(UserResponse)
	.addError(HttpApiError.Unauthorized)
	.addError(GenericError, { status: 422 });

export const usersGroup = HttpApiGroup.make('Users')
	.add(login)
	.add(createUser)
	.add(getCurrentUser)
	.add(updateCurrentUser);
