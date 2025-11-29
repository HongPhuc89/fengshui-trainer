## Project Rules & Conventions

This document defines the common rules and conventions that all services in this monorepo should follow, with `mrc_backend-develop` as the primary reference.

### General Principles

- **Consistency first**
  - Follow existing patterns before introducing new ones.
  - Prefer reuse of shared modules and helpers under `src/shares` over duplicating logic.

- **Security by default**
  - All non-public APIs must be protected via proper guards (e.g. `JwtAuthGuard`, role-based checks).
  - Never log secrets, tokens, passwords, or OTPs.
  - Validate and sanitize all external input with DTOs and `class-validator`.

- **Config-driven behavior**
  - Do not hardcode environment-specific values.
  - Use the `config` package and typed configuration interfaces under `src/shares/interfaces/config`.
  - Access configuration via central helpers such as `getConfig()` or core config services.

- **Internationalization & localization**
  - User-facing messages should go through `nestjs-i18n` with keys defined in `src/i18n/{lang}` JSON files.
  - Do not hardcode English texts in exceptions or validation messages; use translation keys instead.

- **Observability & logging**
  - Use the shared `Logger` utilities and interceptors for request/response logging.
  - Prefer structured logs (objects) over plain strings to support better analysis.
  - Use debug logs for client errors (4xx) and error logs for server errors (5xx).

### Validation, DTOs & Entities

- **DTO usage**
  - Always define request/response DTOs in a dedicated `dtos` folder per module.
  - Annotate DTOs with `class-validator` and `class-transformer` decorators.
  - Use `plainToInstance` before returning DTOs from controllers when necessary.

- **Entity design**
  - Entities must be located in `entities` folders and use TypeORM decorators consistently.
  - Every entity must have an explicit primary key and base auditing fields when applicable.
  - Migrations must reflect all entity schema changes and be created via the shared TypeORM datasource.

### Error Handling

- **Global filters**
  - Rely on the global `HttpExceptionFilter` and i18n validation filter for standardized error responses.
  - Map all domain-specific errors to consistent error codes and messages.

- **Throw, don’t hide errors**
  - Throw NestJS HTTP exceptions (`BadRequestException`, `UnauthorizedException`, etc.) with i18n keys.
  - Do not swallow errors silently; log them or rethrow them with context.

### Authentication, Authorization & Sessions

- **JWT-based auth**
  - Use the shared guards (`JwtAuthGuard`, `LocalAuthGuard`, etc.) and strategies defined in the `auth` module.
  - Tokens should be validated and checked against active token hashes stored in cache when required.

- **Role and permission checks**
  - Implement role-based access via decorators and guards where applicable.
  - Keep authorization logic in services/guards, not in controllers.

### APIs & Contracts

- **RESTful design**
  - Follow resource-based routes (`/users`, `/auth/login`, `/missions/:id`) and conventional HTTP verbs.
  - Avoid mixing read/write operations in a single endpoint.

- **Swagger documentation**
  - Every controller method must be documented using `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`, etc.
  - Use tags to organize APIs and ensure they appear correctly in the auto-generated Swagger docs.

### Performance & Pagination

- **Pagination**
  - Use the shared pagination helpers (`createPagination`, interfaces under `shares/pagination`).
  - All list endpoints must support pagination or explicit limits to prevent unbounded queries.

- **Database access**
  - Use repository/service patterns and avoid raw queries unless strictly necessary.
  - Index frequently queried columns and review migrations to keep query performance acceptable.

### Testing & Quality

- **Automated tests**
  - Unit tests should be placed under `__tests__` or `*.spec.ts` per NestJS conventions.
  - Services and critical controllers must have tests that cover success and failure paths.

- **Static analysis & formatting**
  - Use ESLint and Prettier configurations from the root project.
  - CI should run `npm run lint` and tests (`npm run test`, `npm run test:e2e`) before merging changes.

### Deployment & Operations

- **Environment management**
  - Use `env.example` as the canonical template for required environment variables.
  - Do not add secrets to the repository; use environment variables or secret managers.

- **Background processing**
  - Use the shared queue/worker infrastructure (`Bull`, worker module) for long-running or async tasks.
  - Ensure idempotency for jobs and log failures with enough context for debugging.
