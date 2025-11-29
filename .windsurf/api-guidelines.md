## API Guidelines

This document describes how to design, implement, and document HTTP APIs in this project, following the style of `mrc_backend-develop`.

### 1. General Principles

- **REST-first**
  - Design APIs around resources and standard HTTP verbs.
  - Use nouns for resource names (`/users`, `/missions`), not verbs (`/getUsers`).

- **Consistency across modules**
  - Reuse shared guards, interceptors, DTO patterns, and pagination helpers.
  - Ensure similar resources expose similar endpoints with the same semantics.

- **Backward compatibility**
  - Avoid breaking changes to request/response contracts.
  - When necessary, introduce new fields or new versions instead of changing behavior silently.

### 2. URL Design & Versioning

- **Base URL & prefix**
  - The HTTP prefix is configured via `app.prefix` in config. All controllers should respect this global prefix.

- **Versioning**
  - Prefer path-based versioning when needed, for example: `/v1/users`, `/v2/users`.
  - New versions should coexist with old ones until clients have fully migrated.

- **Resource naming**
  - Use plural nouns for collections: `/users`, `/missions`, `/notifications`.
  - Use path parameters for specific resources: `/users/{id}`, `/missions/{missionId}`.
  - Use sub-resources for strongly related entities: `/users/{id}/wallet`, `/users/{id}/devices`.

### 3. HTTP Methods & Status Codes

- **Methods**
  - `GET` for retrieval (no side effects).
  - `POST` for creation or non-idempotent actions.
  - `PUT` for full updates.
  - `PATCH` for partial updates.
  - `DELETE` for deletions or soft deletions.

- **Status codes**
  - `200 OK` for successful reads or non-creation operations.
  - `201 Created` for successful creations.
  - `204 No Content` when there is no response body.
  - `400 Bad Request` for validation or input errors.
  - `401 Unauthorized` for missing/invalid authentication.
  - `403 Forbidden` for insufficient permissions.
  - `404 Not Found` for missing resources.
  - `409 Conflict` for conflicting state (e.g. email already exists, token invalidated).
  - `422 Unprocessable Entity` when input is syntactically correct but semantically invalid.
  - `500`+ for unexpected server errors.

### 4. Request & Response Payloads

- **DTOs for all payloads**
  - All request bodies and query parameters must be modeled with DTOs in the module’s `dtos` folder.
  - Use `class-validator` for validation and `class-transformer` for transformation.
  - Avoid accepting raw `any` payloads.

- **Response structure**
  - Responses should be typed DTOs (e.g. `LoginResponseDto`, `UserResponseDto`).
  - Use `plainToInstance()` when returning DTOs from controllers, if needed, to ensure proper serialization.
  - Do not expose internal implementation details (e.g. passwords, internal IDs, debug fields).

- **Pagination**
  - For list endpoints, support pagination parameters (e.g. `page`, `perPage`) and use shared pagination utilities.
  - Include pagination metadata in responses where appropriate (e.g. `page`, `perPage`, `total`).

### 5. Authentication & Authorization

- **Authentication**
  - Use JWT Bearer tokens for authenticated routes.
  - Protect endpoints with `@UseGuards(JwtAuthGuard)` or other appropriate guards.
  - For login flows, use `LocalAuthGuard` and corresponding DTOs.

- **Authorization**
  - Implement role-based or permission-based access checks in guards or services.
  - Include `@ApiBearerAuth()` in Swagger for authenticated endpoints.

### 6. Error Handling

- **Global exception model**
  - All errors should be normalized via global filters (`HttpExceptionFilter`, i18n validation filter).
  - Error responses should include a clear message, status code, and any relevant metadata.

- **Validation errors**
  - Use `I18nValidationPipe` and DTO validators.
  - Return localized, user-friendly messages from translation files (e.g. `i18n/en/auth.json`).

- **Domain errors**
  - Throw NestJS HTTP exceptions with translation keys instead of hardcoded text.
  - Use `ConflictException` for conflicts (e.g. invalidated token, duplicate data).

### 7. Internationalization (i18n)

- **Messages & translations**
  - All user-facing messages must be i18n-aware and use translation keys.
  - Keep `en` and `vi` translations in sync under the `i18n` directory.

- **Validation & error texts**
  - Configure validation pipes and exception filters to use i18n messages.
  - Avoid embedding natural language in DTO decorators; reference translation keys instead.

### 8. Logging & Monitoring

- **Request/response logging**
  - Use `LoggerInterceptor` to log all incoming requests and outgoing responses.
  - Include correlation IDs or relevant context where possible.

- **Error logging**
  - Errors should be logged via the shared `Logger` utilities (`debugLog`, `errorLog`) with structured data.
  - Do not log full stack traces or sensitive data to user responses, only to logs.

### 9. Documentation (Swagger/OpenAPI)

- **Controller documentation**
  - Use `@ApiTags` per controller to group endpoints.
  - Use `@ApiOperation` with `operationId`, `summary`, and `description`.
  - Use `@ApiResponse` to document expected responses and their DTO types.
  - For authenticated routes, use `@ApiBearerAuth()`.

- **Generated specs**
  - Swagger specs are generated at startup and written to `output-specs/swagger.json`.
  - Keep DTOs and decorators up to date to ensure the generated docs reflect the actual behavior.

### 10. Performance & Rate Limiting

- **Pagination & limits**
  - Never return unbounded lists; always enforce sensible defaults and maximums.
  - Prefer cursor-based pagination for very large datasets where appropriate.

- **Throttling**
  - Use `@nestjs/throttler` with Redis-backed storage for rate limiting where necessary.
  - Configure throttle settings via the shared configuration interfaces.

### 11. Backward Compatibility & Deprecation

- **Deprecating APIs**
  - When an endpoint is replaced, keep the old one available for a deprecation period.
  - Document deprecation in Swagger and external API documentation.
  - Provide clear migration paths and communicate changes to consumers.
