# Codebase Overview – AI Book Trainer (Quiz Game)

This document provides a high-level overview of the codebase for the AI Book Trainer (Quiz Game), a Turborepo monorepo platform where admins upload books and users learn through interactive flashcards, mind maps, and quizzes.

**Last Updated:** December 2024

---

## 📁 Project Structure (Turborepo Monorepo)

```
quiz-game/
├── apps/
│   ├── backend/              → NestJS Backend API
│   ├── admin/                → React Admin Dashboard (React Admin)
│   └── mobile/               → React Native Mobile App (Expo)
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

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
├──────────────────────────┬──────────────────────────────────┤
│   Admin Dashboard        │      Mobile App                  │
│   (React Admin)          │      (React Native + Expo)       │
│   - Book Management      │      - Study Flashcards          │
│   - Chapter Editor       │      - Take Quizzes              │
│   - Quiz Builder         │      - View Mind Maps            │
│   - Mind Map Editor      │      - Track Progress            │
│   - User Management      │      - Profile Management        │
└──────────────────────────┴──────────────────────────────────┘
                              ↓ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                      Backend Layer (NestJS)                  │
├─────────────────────────────────────────────────────────────┤
│  Auth Module  │  Books  │  Chapters  │  Flashcards  │ Quiz │
│  Users Module │  Upload │  MindMap   │  Experience  │ Lvls │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
├──────────────────────────┬──────────────────────────────────┤
│   PostgreSQL             │      Supabase Storage            │
│   (External/Managed)     │      (File Storage)              │
│   - User data            │      - Book files (PDF, DOCX)    │
│   - Books & Chapters     │      - Cover images              │
│   - Flashcards & Quizzes │      - User avatars              │
│   - Progress tracking    │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

### Deployment Architecture

```
┌─────────────────┐      ┌──────────────────┐
│ Local (Windows) │      │  VPS (Ubuntu)    │
│  - Build code   │──────│  - Node.js       │
│  - npm run build│ SCP  │  - PM2           │
└─────────────────┘      │  - Nginx         │
                         └──────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ↓                           ↓
         ┌──────────────────┐      ┌──────────────────┐
         │ External Database│      │ Supabase Storage │
         │  - Supabase      │      │  - File uploads  │
         │  - Railway       │      │  - Images        │
         │  - Neon          │      └──────────────────┘
         └──────────────────┘
```

---

## 1. API Endpoints (RESTful)

### Auth Module (`/api/auth/`)

- `POST /login` – User login
- `POST /register` – User registration
- `GET /profile` – Get current user profile
- `PATCH /profile` – Update user profile

### Books Module

#### Admin Endpoints (`/api/admin/books/`)

- `POST /` – Create/Upload a new book
- `GET /` – List all books (with pagination)
- `GET /{id}` – Get book details
- `PATCH /{id}` – Update book details
- `DELETE /{id}` – Delete a book
- `POST /{id}/process` – Process book content extraction

#### Public Endpoints (`/api/books/`)

- `GET /` – List available books
- `GET /{id}` – Get book details with chapters

### Chapters Module

#### Admin Endpoints (`/api/admin/chapters/`)

- `POST /` – Create a new chapter
- `GET /book/{bookId}` – List chapters for a book
- `GET /{id}` – Get chapter details
- `PATCH /{id}` – Update chapter
- `DELETE /{id}` – Delete chapter
- `GET /{id}/mindmap` – Get chapter mind map
- `POST /{id}/mindmap` – Create mind map
- `PUT /{id}/mindmap` – Update mind map

#### Public Endpoints (`/api/chapters/`)

- `GET /book/{bookId}` – List chapters for a book
- `GET /{id}` – Get chapter details
- `GET /{id}/mindmap` – Get chapter mind map (if active)

### Flashcards Module

#### Admin Endpoints (`/api/admin/flashcards/`)

- `POST /generate` – Generate flashcards from chapter content
- `POST /` – Create a flashcard manually
- `GET /chapter/{chapterId}` – List flashcards for a chapter (with pagination)
- `PATCH /{id}` – Update flashcard
- `DELETE /{id}` – Delete flashcard

#### User Endpoints (`/api/flashcards/`)

- `GET /chapter/{chapterId}` – Get flashcards for studying
- `GET /{id}` – Get flashcard details

### Quiz Module

#### Admin Endpoints (`/api/admin/quiz/`)

- `POST /questions` – Create quiz question
- `GET /questions/chapter/{chapterId}` – List questions (with filters & pagination)
- `PATCH /questions/{id}` – Update question
- `DELETE /questions/{id}` – Delete question
- `GET /config/chapter/{chapterId}` – Get quiz config
- `PUT /config/chapter/{chapterId}` – Update quiz config

#### User Endpoints (`/api/quiz/`)

- `GET /chapter/{chapterId}` – Get quiz for chapter
- `POST /submit` – Submit quiz answers
- `GET /results/{id}` – Get quiz results

### Experience & Levels Module

#### Admin Endpoints (`/api/admin/experience/`)

- `GET /logs` – Get experience logs (with filters)
- `POST /grant` – Grant experience to user

#### Public Endpoints (`/api/levels/`)

- `GET /` – List all cultivation levels
- `GET /user/{userId}` – Get user's current level

### Upload Module (`/api/upload/`)

- `POST /` – Upload file to Supabase storage
- `GET /{id}` – Get file metadata

---

## 2. Main Modules (Backend - `apps/backend/src/modules/`)

### 2.1 Core Modules

- **CoreModule**: Core configuration services (ConfigService)
- **TypeormModule**: Database connection and configuration
- **AuthModule**: Authentication and authorization (JWT, Passport)
- **UsersModule**: User account management and profiles
- **UserCredentialModule**: User credential storage and verification
- **BooksModule**: Book management, file uploads, and content processing
- **ChaptersModule**: Chapter management and content
- **FlashcardsModule**: Flashcard generation and management
- **QuizModule**: Quiz question bank and quiz sessions
- **MindMapModule**: Mind map creation and management
- **ExperienceModule**: User experience and level tracking
- **UploadModule**: File upload to Supabase storage

### 2.2 Database Entities

- **User**: User account data, roles, profile
- **UserCredential**: Encrypted user credentials
- **Book**: Book metadata, file references, cover images
- **Chapter**: Book chapters structure and content
- **Flashcard**: Flashcards for learning
- **Question**: Quiz questions (multiple choice, true/false, etc.)
- **QuizConfig**: Quiz configuration per chapter
- **QuizSession**: User quiz attempts
- **QuizAnswer**: User answers to quiz questions
- **MindMap**: Mind map data (markdown-based)
- **ExperienceLog**: User experience gain history
- **Level**: Cultivation levels and requirements
- **UploadedFile**: File upload metadata

### 2.3 Shared & Common (`apps/backend/src/shares/`)

- **Decorators**: Custom decorators (`@CurrentUser`, `@Roles`, `@Public`)
- **Guards**: Auth and Role guards (`JwtAuthGuard`, `RolesGuard`)
- **Filters**: Global exception filters
- **Interceptors**: Response transformation interceptors
- **DTOs**: Data Transfer Objects for validation
- **Constants**: Application constants and enums

---

## 3. Admin Dashboard (`apps/admin/`)

### Technology Stack

- **React Admin**: Admin framework
- **Material-UI**: UI components
- **React Router**: Routing
- **Axios**: HTTP client

### Features

#### Book Management

- Upload books (PDF, DOCX, TXT)
- Edit book metadata (title, description, cover)
- Process book content
- View book statistics

#### Chapter Management

- Create/edit chapters
- Manage chapter content
- Configure quiz settings
- Create mind maps (Markmap)

#### Flashcard Management

- Generate flashcards with AI
- Manual flashcard creation
- Edit/delete flashcards
- Pagination support

#### Quiz Management

- Create quiz questions
- Multiple question types:
  - Multiple Choice
  - Multiple Answer
  - True/False
- Question filtering and search
- Quiz configuration per chapter

#### Mind Map Editor

- Markdown-based editor
- Live preview with Markmap
- URL-based editing (`/chapters/:bookId/:chapterId/mindmap/edit`)
- Interactive visualization

#### User Management

- View users
- Grant experience points
- View experience logs
- Track user progress

### Routing Structure

```
/books                          → Book list
/books/:id                      → Book details
/chapters/:bookId/:chapterId    → Chapter details
/chapters/:bookId/:chapterId/flashcards  → Flashcards
/chapters/:bookId/:chapterId/questions   → Quiz questions
/chapters/:bookId/:chapterId/config      → Quiz config
/chapters/:bookId/:chapterId/mindmap     → Mind map view
/chapters/:bookId/:chapterId/mindmap/edit → Mind map editor
/users                          → User list
/experience-logs                → Experience logs
/levels                         → Cultivation levels
```

---

## 4. Mobile App (`apps/mobile/`)

### Technology Stack

- **React Native**: Mobile framework
- **Expo**: Development platform
- **React Navigation**: Navigation
- **Axios**: HTTP client
- **AsyncStorage**: Local storage

### Features

- User authentication (login/register)
- Browse books and chapters
- Study flashcards
- Take quizzes
- View mind maps
- Track progress and levels
- Profile management

---

## 5. Key Workflows

### 1. Admin Uploads Book

1. Admin uploads a book file (PDF, DOCX, TXT) via admin dashboard
2. System stores file in Supabase storage
3. Admin triggers processing to extract content
4. System creates chapters and chunks content
5. Book is ready for user consumption

### 2. Admin Creates Mind Map

1. Admin navigates to chapter mind map page
2. Clicks "Create Mind Map" or "Edit Mind Map"
3. Navigates to `/chapters/:bookId/:chapterId/mindmap/edit`
4. Edits markdown in editor tab
5. Previews in preview tab (live Markmap rendering)
6. Saves mind map
7. Returns to mind map view page

### 3. Admin Generates Flashcards

1. Admin selects a chapter
2. Triggers flashcard generation
3. System processes chapter content using AI
4. Flashcards are created with front (question) and back (answer)
5. Admin can edit or delete generated flashcards

### 4. Admin Creates Quiz

1. Admin creates quiz questions for a chapter
2. Selects question type (Multiple Choice, True/False, etc.)
3. Adds question text and options
4. Configures quiz settings (time limit, pass score, etc.)
5. Quiz is ready for users

### 5. User Studies

1. User browses books and selects a book
2. User selects a chapter to study
3. User can:
   - Study flashcards
   - Take quizzes
   - View mind maps
4. User earns experience points
5. User levels up based on experience

---

## 6. Deployment

### Development

```bash
# Run all apps
npm run dev

# Run specific app
npm run backend:dev
npm run admin:dev
npm run mobile:dev
```

### Production

#### Backend Deployment (VPS)

1. **Build locally:**

   ```bash
   npm run build --workspace=@quiz-game/backend
   ```

2. **Deploy to VPS:**

   ```bash
   ./deploy-simple.sh
   ```

3. **VPS runs:**
   - Node.js + PM2
   - Nginx (reverse proxy)
   - Connects to external database (Supabase/Railway/Neon)

See `VPS_SIMPLE_DEPLOY.md` for detailed guide.

#### Admin Dashboard

- Build: `npm run build --workspace=@quiz-game/admin`
- Deploy to static hosting (Vercel, Netlify, etc.)

#### Mobile App

- Build with Expo EAS
- Deploy to App Store / Play Store

---

## 7. Environment Variables

### Backend (`apps/backend/.env`)

```env
# Server
PORT=3000
NODE_ENV=production

# Database (External)
DATABASE_HOST=db.your-project.supabase.co
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=xxx
DATABASE_NAME=postgres
DATABASE_SSL=true

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://yourdomain.com

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### Admin (`apps/admin/.env`)

```env
VITE_API_URL=https://api.yourdomain.com
```

### Mobile (`apps/mobile/.env`)

```env
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## 8. Technology Stack

### Backend

- **NestJS 10**: Main framework
- **TypeORM 0.3**: ORM for database interaction
- **PostgreSQL**: Relational database (external)
- **Passport + JWT**: Authentication
- **Swagger**: API documentation
- **class-validator**: DTO validation

### Admin Dashboard

- **React Admin**: Admin framework
- **Material-UI (MUI)**: UI components
- **Markmap**: Mind map visualization
- **React Router**: Routing

### Mobile App

- **React Native**: Mobile framework
- **Expo**: Development platform
- **React Navigation**: Navigation

### Monorepo Tools

- **Turborepo**: Build orchestration and caching
- **npm Workspaces**: Package management
- **Husky**: Git hooks
- **Prettier**: Code formatting
- **ESLint**: Code linting

### Third-Party Services

- **Supabase**: File storage and database (optional)
- **Railway/Neon**: Managed PostgreSQL (optional)

---

## 9. Documentation

### Guides

- `README.md` – Main project documentation
- `VPS_SIMPLE_DEPLOY.md` – VPS deployment guide
- `DEPLOYMENT.md` – General deployment guide
- `DEV_COMMANDS.md` – Development commands
- `TURBOREPO_SETUP.md` – Turborepo setup

### Feature Guides

- `MARKMAP_GUIDE.md` – Mind map feature guide
- `PROFILE_QUICK_START.md` – User profile guide

### Knowledge Base

- `knowledge/codebase-overview.md` – This file
- `knowledge/structure/` – Detailed architecture docs

---

## 10. Recent Updates

### December 2024

**Features:**

- ✅ Mind map editor with URL routing
- ✅ Markmap integration with autoloader
- ✅ Quiz question management with filters
- ✅ Experience and level system
- ✅ User profile management
- ✅ Admin routing refactor (URL-based)

**Improvements:**

- ✅ Simplified VPS deployment (build local, deploy to VPS)
- ✅ External database support (Supabase, Railway, Neon)
- ✅ Better admin navigation with sidebar
- ✅ Pagination for flashcards and questions
- ✅ Markmap preview with live updates

**Architecture:**

- ✅ Monorepo with Turborepo
- ✅ Modular NestJS backend
- ✅ React Admin dashboard
- ✅ React Native mobile app
- ✅ External database deployment

---

For more details, see the `knowledge/structure/` directory for module-specific documentation.
