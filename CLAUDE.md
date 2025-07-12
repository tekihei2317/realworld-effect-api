# CLAUDE.md

日本語で回答してください。

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a RealWorld API implementation (Medium.com clone) built with Effect-TS for learning purposes. The project is designed to support dual deployment targets:

- **Primary**: Cloudflare Workers + D1 (SQLite)
- **Secondary**: Node.js + PostgreSQL

## Architecture Design

### Technology Stack

- **Runtime**: Cloudflare Workers (primary), Node.js (secondary)
- **Database**: Cloudflare D1 (primary), PostgreSQL (secondary) 
- **HTTP Server**: `@effect/platform`
- **Database Access**: `@effect/sql`, `@effect/sql-d1`
- **Core Framework**: Effect-TS

### Database Abstraction Strategy

The codebase should implement a repository pattern to abstract database operations, allowing seamless switching between D1 (SQLite) and PostgreSQL:

```typescript
interface UserRepository {
  findById(id: string): Promise<User | null>
  create(user: User): Promise<User>
  // ... other methods
}

// Implementations:
// - D1UserRepository (for Cloudflare Workers)
// - PostgreSQLUserRepository (for Node.js)
```

### Data Models

Based on design.md, the core entities are:
- Users (ID, username, bio?, image?, created_at)
- Auth (user_id, email, password_hash)
- Articles (ID, title, description, body, slug, created_at, updated_at)
- Tags (ID, name, created_at)
- Comments (ID, article_id, user_id, body, created_at)
- Favorites (user_id, article_id, favorited_at)
- Follows (follower_id, followee_id, followed_at)

## RealWorld API Requirements

The API must implement the [RealWorld backend specification](https://docs.realworld.build/specifications/backend/endpoints/):

### Core Features

- Authentication (login, register, current user, update user)
- User profiles (get profile, follow/unfollow)
- Articles (CRUD, list with filters, feed)
- Comments (create, list, delete)
- Favorites (favorite/unfavorite articles)
- Tags (list all tags)

### Testing

Use the official [RealWorld Postman collection](https://github.com/gothinkster/realworld/tree/main/api) for API testing.

## Development Notes

- Username validation: The frontend allows Unicode usernames but the API should handle URL-safe usernames
- Slug generation: Article slugs should be generated from title or content
- Authentication: JWT-based authentication system required
- CORS: Enable appropriate CORS headers for frontend integration

## Project Status

This is an early-stage project. The immediate development priorities from design.md are:
1. Project setup and dependency installation
2. Database migrations
3. First API endpoint implementation (non-authenticated)
4. Test setup with Postman collection
5. Authentication implementation
6. Remaining API endpoints
