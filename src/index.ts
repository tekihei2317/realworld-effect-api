import { createWebHandler } from './api/api-impl';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const { handler, dispose } = createWebHandler({ db: env.DB });
		const response = await handler(request);
		await dispose();

		return response;
	},
} satisfies ExportedHandler<Env>;
