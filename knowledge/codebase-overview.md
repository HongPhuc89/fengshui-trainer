# Codebase Overview – AI Book Trainer

This document provides a high-level overview of the codebase for the AI Book Trainer, a platform where admins upload books and users learn and take exams based on those books. The project follows NestJS best practices and uses a modular architecture.

---

## 1. API Endpoints (RESTful)

- **Auth** (`/api/v1/auth/`)
  - `POST /login` – User login
  - `POST /register` – User registration
  - `POST /refresh` – Refresh token

- **Books** (`/api/v1/books/`)
  - `GET` – List available books
  - `GET /{id}` – Get book details
  - `POST` – Upload/Create a new book (Admin only)
  - `PATCH /{id}` – Update book details (Admin only)
  - `DELETE /{id}` – Remove a book (Admin only)

- **Learning** (`/api/v1/learning/`)
  - `POST /start/{bookId}` – Start learning a book
  - `GET /progress/{bookId}` – Get learning progress
  - `POST /complete-chapter/{chapterId}` – Mark chapter as completed

- **Exams** (`/api/v1/exams/`)
  - `POST /generate/{bookId}` – Generate an exam for a book
  - `POST /submit/{examId}` – Submit exam answers
  - `GET /history` – Get exam history
  - `GET /{id}/result` – Get exam result

---

## 2. Main Modules

### 2.1 Core Modules (`src/modules/`)

- **AuthModule**: Handles authentication and authorization (JWT, Passport).
- **UserModule**: Manages user accounts and roles (Admin, User).
- **BookModule**: Handles book management, file uploads, and content processing.
- **LearningModule**: Tracks user progress and learning status.
- **ExamModule**: Manages exam generation, submission, and grading.

### 2.2 Database Entities (`src/modules/**/entities/`)

- **User**: User account data.
- **Book**: Book metadata and content references.
- **Chapter**: Structure of the book.
- **Progress**: User's learning progress.
- **Exam**: Exam instances.
- **Question**: Exam questions generated from book content.
- **Answer**: User's answers to exam questions.

### 2.3 Shared & Common (`src/common/`)

- **Decorators**: Custom decorators (e.g., `@CurrentUser`, `@Roles`).
- **Guards**: Auth and Role guards (e.g., `JwtAuthGuard`, `RolesGuard`).
- **Filters**: Global exception filters.
- **Interceptors**: Response transformation interceptors.
- **DTOs**: Data Transfer Objects for validation.

### 2.4 Config (`src/config/`)

- **TypeORM Config**: Database connection settings.
- **Environment Config**: Configuration validation using `joi` or `class-validator`.

---

## 3. Testing

- **Unit Tests**: `*.spec.ts` files alongside services and controllers.
- **E2E Tests**: Located in `test/` directory.
- **Running Tests**:
  - `npm run test` – Run unit tests.
  - `npm run test:e2e` – Run end-to-end tests.

---

## 4. Infrastructure & Tooling

- **NestJS**: Main framework.
- **TypeORM**: ORM for database interaction.
- **PostgreSQL**: Relational database.
- **Docker**: Containerization for app and database.
- **Swagger**: API documentation (available at `/api/docs`).
- **Passport**: Authentication strategies.

---

## 5. Key Workflows

1.  **Admin Uploads Book**: Admin uploads a PDF/Text file. The system processes it and extracts chapters/content.
2.  **User Starts Learning**: User selects a book and starts reading. Progress is tracked per chapter.
3.  **Exam Generation**: System generates questions based on the book content using AI (integration to be implemented/mocked).
4.  **Exam Taking**: User answers questions and submits for grading.

---

For more details, see:

- `README.md` (setup instructions)
- `knowledge/structure/feature-summary.md` (detailed feature list)
- `knowledge/structure/tech-context.md` (technology stack details)
