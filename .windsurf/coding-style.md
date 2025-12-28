## Coding Style

This document summarizes the coding style and conventions for TypeScript/NestJS services in this repository, based on `mrc_backend-develop`.

### 1. Language & Syntax

- **TypeScript first**
  - All application code is written in TypeScript.
  - Prefer strict typing and explicit interfaces/types instead of `any`.
  - Use ES modules (`import`/`export`) and keep imports organized (external packages, then internal modules).

- **Modern JavaScript features**
  - Use `async/await` for asynchronous operations.
  - Prefer `const` and `let` over `var`.
  - Prefer template literals over string concatenation.

### 2. Formatting & Linting

- **Prettier & ESLint**
  - Formatting is handled by Prettier using the project’s config.
  - Linting is enforced via ESLint (`npm run lint`) with `@typescript-eslint` integration.
  - Code must pass both lint and format checks before merge.

- **Style rules (examples)**
  - Use single quotes for strings unless escaping becomes awkward.
  - Avoid trailing spaces and unused imports.
  - Break long lines for readability and follow configured max line length if specified.

### 3. NestJS Patterns

- **Modules, Controllers, Services**
  - Each feature is encapsulated in a Nest module (`*.module.ts`).
  - Controllers handle HTTP concerns (routing, input/output mapping, docs).
  - Services encapsulate business logic and data access.

- **Dependency injection**
  - Use constructor injection for dependencies.
  - Do not instantiate services or repositories manually; rely on Nest’s DI container.

- **Decorators & metadata**
  - Use Nest decorators for routing (`@Controller`, `@Get`, `@Post`, etc.), guards, interceptors, and pipes.
  - Use custom decorators from `src/shares/decorators` for consistent behavior (e.g. `@User()`).

### 4. DTOs, Validation & Transformation

- **DTO definitions**
  - Place DTOs in `dtos/` folders per module.
  - Use `class-validator` decorators to enforce input constraints.
  - Use `class-transformer` to transform and expose fields in responses.

- **Validation**
  - Rely on global `I18nValidationPipe` for request validation.
  - Avoid manual validation logic in controllers where the pipe can handle it.

### 5. Error Handling & Exceptions

- **Exception types**
  - Use Nest HTTP exceptions (`BadRequestException`, `UnauthorizedException`, `ConflictException`, etc.) consistently.
  - Centralize error mapping in shared exception helpers where possible.

- **Error messages**
  - Use i18n keys for messages, not hardcoded English strings.
  - Log underlying technical details via `Logger`, but return only user-safe messages to clients.

### 6. Logging & Monitoring

- **Logger usage**
  - Use `nestjs-pino` logger and the shared `Logger` utilities for structured logging.
  - Avoid `console.log` in production code; use centralized logging instead.

- **Interceptors**
  - Use `LoggerInterceptor` for HTTP request/response logs.
  - Leverage other interceptors (e.g. `LanguageInterceptor`, pagination interceptors) to keep controllers thin.

### 7. Database & TypeORM

- **Entities & repositories**
  - Use TypeORM entities in `entities/` folders with clear column definitions and relations.
  - Use repositories or `TypeOrmModule.forFeature()` to access entities through services.

- **Migrations**
  - Reflect all schema changes via migrations under `src/migrations/`.
  - Do not rely on automatic schema synchronization in production environments.

### 8. Configuration & Environment

- **Config access**
  - Use the `config` package and typed configuration interfaces in `src/shares/interfaces/config`.
  - Avoid direct `process.env` access deep inside business logic; centralize it in config services/helpers.

- **Environment variables**
  - Keep `env.example` up to date with required variables.
  - Never commit real credentials or secrets to the repository.

### 9. Testing Conventions

- **Unit tests**
  - Use Jest for unit tests with `*.spec.ts` files.
  - Organize tests to mirror the module and service structure.
  - Mock external dependencies (DB, external services, cache, etc.) to keep unit tests fast.

- **E2E tests**
  - Use the provided Jest e2e config to test the application end-to-end.
  - Verify routing, validation, authentication, and typical workflows.

### 10. Performance & Reliability

- **Async & background work**
  - For long-running or heavy operations, use queues (`@nestjs/bull`) and worker processes.
  - Ensure idempotent and retry-safe job implementations.

- **Pagination & limits**
  - Use shared pagination helpers to avoid unbounded queries.
  - Apply indexes and query optimizations where needed and manage them via migrations.

### 11. Code Review Guidelines

- **Before opening a PR**
  - Run lint, tests, and formatting locally.
  - Ensure new endpoints are documented and covered by tests where meaningful.
  - Keep changes focused and small enough for effective review.
