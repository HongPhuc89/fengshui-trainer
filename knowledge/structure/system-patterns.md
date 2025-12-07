# System Patterns – AI Book Trainer (Quiz Game)

## 🏛️ System Architecture

The application follows a **Turborepo Monorepo** architecture with a **Modular Monolith** backend, designed for scalability and maintainability.

### Architecture Overview

- **Monorepo**: Turborepo with npm Workspaces
- **Backend**: NestJS (Node.js) in `apps/backend/`
- **Frontend**: React (Admin Dashboard - Planned) in `apps/admin/`
- **Mobile**: React Native (Planned) in `apps/mobile/`
- **Shared Packages**: Common code in `packages/`
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **File Storage**: Supabase Storage
- **AI Processing**: LangChain
- **Authentication**: Passport (JWT)
- **Documentation**: Swagger (OpenAPI)

## 🧱 Technology Stack

| Layer         | Technology       | Description                         |
| ------------- | ---------------- | ----------------------------------- |
| Monorepo      | Turborepo        | Build orchestration and caching     |
| Framework     | NestJS 10        | Modular, scalable Node.js framework |
| Language      | TypeScript 5.7   | Strongly typed JavaScript           |
| Database      | PostgreSQL       | Relational database                 |
| ORM           | TypeORM 0.3      | Data access layer                   |
| Auth          | JWT + Passport   | Secure stateless authentication     |
| Validation    | class-validator  | Decorator-based validation          |
| API Docs      | Swagger          | Auto-generated API documentation    |
| File Storage  | Supabase Storage | Cloud file storage                  |
| AI Processing | LangChain        | Text processing and chunking        |
| Package Mgmt  | npm Workspaces   | Monorepo package management         |

## 🔁 Data Flow

### 1. Request Lifecycle

- Client sends request → Controller → Guard (Auth) → Interceptor (Logging) → Service → Repository → Database
- Response flows back through Interceptors → Filter (Error Handling) → Client

### 2. Book Upload & Processing Flow

1. Admin uploads file via `/api/admin/books` → Controller receives multipart/form-data
2. UploadService uploads file to Supabase Storage → Returns file URL
3. BookService creates Book entity with file reference → Saves to Database
4. Admin triggers processing via `/api/admin/books/{id}/process`
5. BookProcessingService:
   - Downloads file from Supabase
   - Parses content (PDF/DOCX/TXT)
   - Extracts text and metadata
   - Creates BookChunk entities
   - Saves to Database

### 3. Flashcard Generation Flow

1. Admin requests flashcard generation via `/api/admin/flashcards/generate`
2. FlashcardService fetches Chapter content
3. LangChain processes chapter text:
   - Splits text into manageable chunks
   - Analyzes content for key concepts
   - Generates question-answer pairs
4. FlashcardService creates Flashcard entities
5. Saves flashcards to Database
6. Returns generated flashcards to Client

### 4. User Study Flow (Planned)

1. User requests flashcards via `/api/flashcards/chapter/{chapterId}`
2. FlashcardService fetches flashcards for the chapter
3. Returns flashcards to Client (shuffled/ordered)
4. User interacts with flashcards (flip, answer)
5. Progress is tracked and saved (Future feature)

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

Each feature module follows this structure:

```
apps/backend/src/modules/feature-name/
├── dtos/
│   ├── create-feature.dto.ts
│   ├── update-feature.dto.ts
│   └── response-feature.dto.ts
├── entities/
│   └── feature.entity.ts
├── feature.controller.ts          # Public endpoints
├── admin-feature.controller.ts    # Admin endpoints (if needed)
├── feature.service.ts
└── feature.module.ts
```

### Example: Books Module

```
apps/backend/src/modules/books/
├── dtos/
│   ├── create-book.dto.ts
│   ├── update-book.dto.ts
│   ├── create-chapter.dto.ts
│   └── generate-flashcards.dto.ts
├── entities/
│   ├── book.entity.ts
│   ├── chapter.entity.ts
│   ├── book-chunk.entity.ts
│   └── flashcard.entity.ts
├── books.controller.ts              # Public book endpoints
├── admin-books.controller.ts        # Admin book management
├── chapters.controller.ts           # Public chapter endpoints
├── admin-chapters.controller.ts     # Admin chapter management
├── flashcards.controller.ts         # User flashcard endpoints
├── admin-flashcards.controller.ts   # Admin flashcard management
├── books.service.ts
├── chapters.service.ts
├── flashcards.service.ts
├── book-processing.service.ts       # Content extraction logic
└── books.module.ts
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
