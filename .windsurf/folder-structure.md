## Folder Structure

This document describes the recommended folder structure for backend services in this repository, based on `mrc_backend-develop`.

### 1. Top-level Layout

- **Project root (`mrc_backend-develop/`)**
  - `config/` – environment-specific configuration files consumed by the `config` package.
  - `docker/` – Docker Compose and related container configuration.
  - `src/` – main application source code.
  - `test/` – e2e and integration test configuration.
  - `datasource.ts` – TypeORM data source configuration.
  - `nest-cli.json`, `tsconfig*.json`, `jest.config.js`, `eslint.config.js` – tooling and build configs.

### 2. `src/` Layout

- **`src/app.module.ts`**
  - Root NestJS module that imports core modules, infrastructure (TypeORM, queues), and feature modules.

- **`src/main.ts`**
  - Application bootstrap: config loading, global pipes/filters/interceptors, CORS, Swagger docs.

- **Key subfolders**
  - `src/modules/` – feature modules organized by domain.
  - `src/shares/` – shared cross-cutting utilities, decorators, helpers, and infra.
  - `src/migrations/` – TypeORM migration files.
  - `src/seeding/` – database seeder scripts.
  - `src/i18n/` – translation JSON files for multiple languages.
  - `src/worker*.ts` – background queue workers.

### 3. `src/modules/` Structure

- **Domain-based modules**
  - Each domain has its own module folder, for example:
    - `auth/` – authentication and authorization.
    - `users/` – user management.
    - `missions/`, `market-place/`, `notifications/`, etc.
  - Admin-specific modules are nested under `modules/admin/` (e.g. `modules/admin/users/`).

- **Common subfolders within a module**
  - `dtos/` – request/response DTO classes.
  - `entities/` – TypeORM entity definitions.
  - `*.module.ts` – Nest module definition.
  - `*.controller.ts` – HTTP controllers, one or more per module.
  - `*.service.ts` – business logic services.
  - `*.constants.ts` – module-specific constants.

- **Admin vs. public modules**
  - Admin modules live under `modules/admin/{feature}` with their own controllers and services.
  - Public-facing modules live under `modules/{feature}`.
  - Shared logic between admin and public variants should be extracted into common services or shares.

### 4. `src/shares/` Structure

- **Purpose**
  - Host all reusable infrastructure and utilities to avoid duplication across feature modules.

- **Key subfolders**
  - `constants/` – shared constants and enums.
  - `decorators/` – reusable NestJS decorators (e.g. `@User()`, common error responses).
  - `enums/` – shared enums (user roles, blockchain enums, etc.).
  - `exceptions/` – domain and HTTP exceptions, error mappers.
  - `filters/` – global exception filters (e.g. `HttpExceptionFilter`).
  - `guards/` – auth and access control guards (`JwtAuthGuard`, `LocalAuthGuard`, etc.).
  - `helpers/` – generic utilities (`utils.ts`, `cryptography.ts`, etc.).
  - `interceptors/` – cross-cutting interceptors (logging, pagination, language, user online).
  - `interfaces/` – shared TypeScript interfaces, especially for config types.
  - `logger/` – centralized logging helpers.
  - `pagination/` – pagination DTOs, helpers, and constants.

### 5. `src/migrations/` & `src/seeding/`

- **Migrations**
  - All schema changes are managed via TypeORM migrations in `src/migrations/`.
  - Filenames should follow an incrementing timestamp-based convention and describe the change.
  - Migrations are generated via the shared TypeORM datasource (`datasource.ts`).

- **Seeders**
  - Seeder scripts in `src/seeding/` populate initial or test data.
  - Use a base seeder pattern with specialized seeders for specific domains (e.g. missions, user groups).

### 6. `src/i18n/`

- **Language folders**
  - Each language has its own folder (e.g. `en/`, `vi/`).
  - Inside each folder, JSON files are grouped by domain: `auth.json`, `user.json`, `mission.json`, etc.

- **Usage**
  - Controllers and services use `nestjs-i18n` to load translation keys defined in these files.

### 7. Testing Structure

- **Unit tests**
  - Use `__tests__/` subfolders or `*.spec.ts` files alongside modules (as in `modules/__tests__`).
  - Group tests by domain and mirror the corresponding module structure.

- **E2E tests**
  - E2E configuration is under `test/` (e.g. `test/jest-e2e.json`).
  - E2E tests should spin up the Nest app with relevant modules and verify behavior at the HTTP layer.

### 8. Applying to `quiz_game`

- **Alignment with template**
  - The `quiz_game` backend should mirror the same high-level layout:
    - `src/modules/*` for domain modules like `auth`, `users`, `core`, `typeorm`, etc.
    - `src/shares/*` for common utilities and infrastructure.
    - `src/migrations` and `src/seeding` for database evolution and seed data.
  - New domains should follow the same patterns used in `mrc_backend-develop` to keep the architecture consistent.
