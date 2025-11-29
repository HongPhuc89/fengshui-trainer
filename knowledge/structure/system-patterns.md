# System Patterns – AI Book Trainer

## 🏛️ System Architecture

The application follows a **Modular Monolith** architecture using NestJS, designed for scalability and maintainability.

- **Backend**: NestJS (Node.js)
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Authentication**: Passport (JWT)
- **Documentation**: Swagger (OpenAPI)

## 🧱 Technology Stack

| Layer      | Technology      | Description                         |
| ---------- | --------------- | ----------------------------------- |
| Framework  | NestJS          | Modular, scalable Node.js framework |
| Language   | TypeScript      | Strongly typed JavaScript           |
| Database   | PostgreSQL      | Relational database                 |
| ORM        | TypeORM         | Data access layer                   |
| Auth       | JWT + Passport  | Secure stateless authentication     |
| Validation | class-validator | Decorator-based validation          |
| API Docs   | Swagger         | Auto-generated API documentation    |

## 🔁 Data Flow

1.  **Request Lifecycle**:
    - Client sends request -> Controller -> Guard (Auth) -> Interceptor (Logging) -> Service -> Repository -> Database.
    - Response flows back through Interceptors -> Filter (Error Handling) -> Client.

2.  **Book Upload Flow**:
    - Admin uploads file -> Controller -> Service (File Storage) -> Service (Content Extraction) -> Database.

3.  **Exam Generation Flow**:
    - User requests exam -> Service (Fetch Book Content) -> AI Service (Generate Questions) -> Database (Save Exam) -> Client.

## 🧠 Key Patterns

- **Dependency Injection (DI)**:
  - NestJS's core pattern. All services and repositories are injected into controllers and other services.

- **Repository Pattern**:
  - Use TypeORM Repositories to abstract database operations.
  - Custom repositories for complex queries.

- **DTO (Data Transfer Object)**:
  - Use classes with `class-validator` decorators to define and validate request payloads.

- **Guard Pattern**:
  - Use Guards (`@UseGuards`) for Authentication and Authorization (RBAC).

- **Interceptor Pattern**:
  - Use Interceptors for response transformation (e.g., excluding passwords) and logging.

- **Filter Pattern**:
  - Global Exception Filter to standardize error responses.

## 🧰 Developer Notes

- **Environment Variables**: Use `ConfigService` to access environment variables.
- **Async/Await**: Always use async/await for database operations.
- **Validation**: Always use DTOs for controller inputs.

## 🔭 Scalability Considerations

- **Microservices Ready**: The modular structure allows easy migration to microservices if needed.
- **Queueing**: Use Bull/Redis for background tasks (e.g., file processing, AI generation).
- **Caching**: Implement Redis caching for frequently accessed data (e.g., book details).

## Code Organization

### Directory Structure

```
src/
├── common/                 # Shared decorators, guards, filters, dtos
├── config/                 # Configuration modules
├── modules/                # Feature modules
│   ├── auth/
│   ├── users/
│   ├── books/
│   ├── learning/
│   └── exams/
├── main.ts
└── app.module.ts
```

### Module Structure

Each feature module should follow this structure:

```
src/modules/feature-name/
├── dto/
│   ├── create-feature.dto.ts
│   └── update-feature.dto.ts
├── entities/
│   └── feature.entity.ts
├── feature.controller.ts
├── feature.service.ts
└── feature.module.ts
```

## Testing Patterns

- **Unit Tests**:
  - Mock dependencies using `jest.fn()`.
  - Test business logic in Services.
  - Test request handling in Controllers.

- **E2E Tests**:
  - Use `supertest` to test API endpoints.
  - Use a test database or transaction rollback.

## Error Handling

- Use standard HTTP exceptions (`NotFoundException`, `BadRequestException`).
- Create custom exceptions for domain-specific errors.
- Use a Global Exception Filter to format error responses consistently.
