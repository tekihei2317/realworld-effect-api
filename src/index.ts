import { handler, dispose } from './api-impl';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const response = await handler(request);
		await dispose();

		return response;
	},
} satisfies ExportedHandler<Env>;
