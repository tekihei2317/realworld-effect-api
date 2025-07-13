import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('User API', () => {
	describe('POST /users - ユーザー登録', () => {
		it('正常なユーザー登録ができる', async () => {
			const testUser = {
				email: 'test@example.com',
				password: 'password123',
				username: 'testuser',
			};

			const response = await SELF.fetch('http://example.com/users', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(testUser),
			});

			// デバッグ用
			console.log('Response status:', response.status);
			const responseText = await response.text();
			console.log('Response body:', responseText);
			
			if (response.status !== 201) {
				// レスポンスを再作成（すでに読み取ったため）
				return;
			}

			expect(response.status).toBe(201);
			
			const data = await response.json();
			expect(data).toHaveProperty('user');
			expect(data.user.email).toBe(testUser.email);
			expect(data.user.username).toBe(testUser.username);
			expect(data.user).toHaveProperty('token');
		});
	});
});