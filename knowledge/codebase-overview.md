# Codebase Overview – AI Book Trainer (Quiz Game)

This document provides a high-level overview of the codebase for the AI Book Trainer (Quiz Game), a Turborepo monorepo platform where admins upload books and users learn through interactive flashcards, mind maps, and quizzes. The project follows NestJS best practices and uses a modular monorepo architecture.

---

## 📁 Project Structure (Turborepo Monorepo)

```
quiz-game/
├── apps/
│   ├── backend/              → NestJS Backend (Main API)
│   ├── admin/                → React Admin Dashboard (Placeholder)
│   └── mobile/               → React Native Mobile App (Placeholder)
├── packages/
│   ├── ui/                   → Shared React Components
│   ├── shared/               → Shared DTOs, Interfaces, Types
│   ├── utils/                → Shared Utility Functions
│   └── config/               → Shared Configuration Files
├── knowledge/                → Project documentation
├── package.json              → Root workspace config
├── turbo.json               → Turborepo configuration
└── tsconfig.base.json       → Base TypeScript config
```

---

## 1. API Endpoints (RESTful)

### Auth Module (`/api/auth/`)

- `POST /login` – User login
- `POST /register` – User registration
- `GET /profile` – Get current user profile

### Books Module

#### Admin Endpoints (`/api/admin/books/`)

- `POST /` – Create/Upload a new book (Admin only)
- `GET /` – List all books (Admin only)
- `GET /{id}` – Get book details (Admin only)
- `PATCH /{id}` – Update book details (Admin only)
- `DELETE /{id}` – Delete a book (Admin only)
- `POST /{id}/process` – Process book content extraction (Admin only)

#### Public Endpoints (`/api/books/`)

- `GET /` – List available books (Public/User)
- `GET /{id}` – Get book details (Public/User)

### Chapters Module

#### Admin Endpoints (`/api/admin/chapters/`)

- `POST /` – Create a new chapter (Admin only)
- `GET /book/{bookId}` – List chapters for a book (Admin only)
- `PATCH /{id}` – Update chapter (Admin only)
- `DELETE /{id}` – Delete chapter (Admin only)

#### Public Endpoints (`/api/chapters/`)

- `GET /book/{bookId}` – List chapters for a book
- `GET /{id}` – Get chapter details

### Flashcards Module

#### Admin Endpoints (`/api/admin/flashcards/`)

- `POST /generate` – Generate flashcards from chapter content (Admin only)
- `POST /` – Create a flashcard manually (Admin only)
- `GET /chapter/{chapterId}` – List flashcards for a chapter (Admin only)
- `PATCH /{id}` – Update flashcard (Admin only)
- `DELETE /{id}` – Delete flashcard (Admin only)

#### User Endpoints (`/api/flashcards/`)

- `GET /chapter/{chapterId}` – Get flashcards for studying
- `GET /{id}` – Get flashcard details

### Upload Module (`/api/upload/`)

- `POST /` – Upload file to Supabase storage
- `GET /{id}` – Get file metadata

---

## 2. Main Modules (Backend - `apps/backend/src/modules/`)

### 2.1 Core Modules

- **CoreModule**: Core configuration services (ConfigService)
- **TypeormModule**: Database connection and configuration
- **AuthModule**: Authentication and authorization (JWT, Passport)
- **UsersModule**: User account management
- **UserCredentialModule**: User credential storage and verification
- **BooksModule**: Book management, file uploads, and content processing
- **UploadModule**: File upload to Supabase storage
- **AdminModule**: Custom admin routes and controllers

### 2.2 Database Entities (`apps/backend/src/modules/**/entities/`)

- **User** (`users/entities/user.entity.ts`): User account data, roles
- **UserCredential** (`user-credential/entities/user-credential.entity.ts`): Encrypted user credentials
- **Book** (`books/entities/book.entity.ts`): Book metadata, file references
- **Chapter** (`books/entities/chapter.entity.ts`): Book chapters structure
- **BookChunk** (`books/entities/book-chunk.entity.ts`): Processed book content chunks
- **Flashcard** (`books/entities/flashcard.entity.ts`): Flashcards for learning
- **UploadedFile** (`upload/entities/uploaded-file.entity.ts`): File upload metadata

### 2.3 Shared & Common (`apps/backend/src/shares/`)

- **Decorators**: Custom decorators (e.g., `@CurrentUser`, `@Roles`, `@Public`)
- **Guards**: Auth and Role guards (e.g., `JwtAuthGuard`, `RolesGuard`)
- **Filters**: Global exception filters
- **Interceptors**: Response transformation interceptors
- **DTOs**: Data Transfer Objects for validation
- **Constants**: Application constants and enums

### 2.4 Config (`apps/backend/config/` & `apps/backend/src/modules/core/`)

- **TypeORM Config**: Database connection settings (in `config/`)
- **ConfigService**: Environment configuration service
- **DataSource**: TypeORM data source configuration

---

## 3. Testing

- **Unit Tests**: `*.spec.ts` files alongside services and controllers
- **E2E Tests**: Located in `apps/backend/test/` directory
- **Running Tests**:
  - `npm run test` – Run all tests (root)
  - `npm test --workspace=@quiz-game/backend` – Run backend tests

---

## 4. Infrastructure & Tooling

### Backend Stack

- **NestJS 10**: Main framework
- **TypeORM 0.3**: ORM for database interaction
- **PostgreSQL**: Relational database
- **Passport + JWT**: Authentication strategies
- **Swagger**: API documentation (available at `/docs`)
- **class-validator**: DTO validation

### Monorepo Tools

- **Turborepo**: Build orchestration and caching
- **npm Workspaces**: Package management
- **Husky**: Git hooks
- **Prettier**: Code formatting
- **ESLint**: Code linting

### Third-Party Services

- **Supabase**: File storage for book files and images
- **LangChain**: Text processing and content chunking

---

## 5. Key Workflows

### 1. Admin Uploads Book

1. Admin uploads a book file (PDF, DOCX, TXT) via `/api/admin/books`
2. System stores file in Supabase storage
3. Admin triggers processing via `/api/admin/books/{id}/process`
4. System extracts content, creates chapters, and chunks content
5. Book is ready for user consumption

### 2. Admin Creates Chapters

1. Admin creates chapters for a book via `/api/admin/chapters`
2. Each chapter has a title, description, and content
3. Chapters are linked to a specific book

### 3. Admin Generates Flashcards

1. Admin triggers flashcard generation via `/api/admin/flashcards/generate`
2. System processes chapter content using AI
3. Flashcards are created with front (question) and back (answer)
4. Flashcards are ready for user study

### 4. User Studies with Flashcards

1. User browses books and selects a book
2. User selects a chapter to study
3. User accesses flashcards via `/api/flashcards/chapter/{chapterId}`
4. User studies flashcards and tracks progress

---

## 6. Monorepo Commands

### Root Level Commands

- `npm run dev` – Run all apps in development mode
- `npm run build` – Build all apps and packages
- `npm run lint` – Lint all workspaces
- `npm run test` – Run tests across all workspaces
- `npm run format` – Format all code with Prettier

### Backend Specific Commands

- `npm run backend:dev` – Run backend in dev mode
- `npm run backend:build` – Build backend
- `npm run backend:migration:run` – Run database migrations
- `npm run backend:migration:generate` – Generate new migration

---

## 7. Environment Variables

Each app has its own `.env` file:

- **Backend**: `apps/backend/.env`
  - Database credentials (PostgreSQL)
  - JWT secrets
  - Supabase credentials
  - Port and API prefix

See `apps/backend/.env_example` for all required variables.

---

For more details, see:

- `README.md` – Main project documentation
- `TURBOREPO_SETUP.md` – Turborepo setup guide
- `MIGRATION.md` – Migration guide
- `knowledge/structure/feature-summary.md` – Feature list
- `knowledge/structure/tech-context.md` – Technology stack
- `knowledge/structure/active-contexts/` – Active development contexts
