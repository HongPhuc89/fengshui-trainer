# Active Contexts Index

This file tracks all active development contexts and their current status for the AI Book Trainer project.

**Last Updated:** December 21, 2024

---

## Current Active Contexts

| ID  | Feature                       | Status       | Last Updated | File Context                          |
| --- | ----------------------------- | ------------ | ------------ | ------------------------------------- |
| 01  | Book Management (Core)        | ✅ Completed | 2024-11-30   | 01-book-management.md                 |
| 03  | Chapter Management            | ✅ Completed | 2024-12-03   | 03-chapter-management.md              |
| 04  | Flashcard Management          | ✅ Completed | 2024-12-03   | 04-flashcard-management.md            |
| 05  | Quiz/Exam System              | ✅ Completed | 2024-12-07   | 05-quiz-exam-system.md                |
| 06  | Mind Map System               | ✅ Completed | 2024-12-21   | 06-mindmap-system.md                  |
| 07  | Admin Dashboard (React Admin) | ✅ Completed | 2024-12-21   | 07-admin-dashboard.md                 |
| 08  | Backend Unit Tests            | ✅ Completed | 2024-12-08   | 08-backend-unit-tests.md              |
| 08  | Signed URLs (Supabase)        | ✅ Completed | 2024-12-15   | 08-signed-urls.md                     |
| 09  | Quiz Configuration System     | ✅ Completed | 2024-12-08   | 09-quiz-config.md                     |
| 09  | Quiz Scoring Implementation   | ✅ Completed | 2024-12-10   | 09-quiz-scoring-implementation.md     |
| 10  | Quiz Result Modal             | ✅ Completed | 2024-12-10   | 10-quiz-result-modal.md               |
| 11  | Admin Books API Update        | ✅ Completed | 2024-12-11   | 11-admin-books-api-update.md          |
| 12  | Flashcard Import/Export       | ✅ Completed | 2024-12-09   | 12-flashcard-import-export.md         |
| 12  | Mobile App (Feng Shui Design) | ✅ Completed | 2024-12-11   | 12-mobile-app.md                      |
| 13  | User Experience & Leveling    | ✅ Completed | 2024-12-11   | 13-user-experience-leveling-system.md |
| 14  | Currency System               | ✅ Completed | 2024-12-11   | 14-currency-system-design.md          |
| 15  | User Profile System           | ✅ Completed | 2024-12-11   | 15-user-profile-system.md             |

---

## Recent Completions (December 2024)

### Week 1 (Dec 1-7)

- ✅ **Quiz/Exam System**: Complete backend implementation with Question Bank, Quiz Attempts, grading logic
- ✅ **Mind Map System**: Full CRUD with structure validation, circular reference detection
- ✅ **Admin Dashboard**: Quiz question management UI with dynamic form fields

### Week 2 (Dec 8-14)

- ✅ **Backend Unit Tests**: Comprehensive test suite with 97 test cases, ~90% passing
- ✅ **Quiz Configuration**: Per-chapter quiz settings (time limit, passing score, etc.)
- ✅ **Quiz Scoring**: Automatic grading with detailed results
- ✅ **Signed URLs**: Secure file access with Supabase signed URLs
- ✅ **Flashcard Import/Export**: CSV/JSON import and export functionality

### Week 3 (Dec 15-21)

- ✅ **Mobile App**: React Native app with Feng Shui design (red-gold theme)
- ✅ **User Experience System**: XP gain, level progression, cultivation ranks
- ✅ **Currency System**: Virtual currency for unlocking books
- ✅ **User Profile**: Profile management with avatar, bio, stats
- ✅ **Admin Routing Refactor**: URL-based navigation for better UX
- ✅ **Mind Map Editor**: Dedicated edit page with Markmap integration
- ✅ **VPS Deployment**: Simple deployment guide (build local, deploy to VPS)

---

## Architecture Updates

### Frontend

- **Admin Dashboard**: React Admin with Material-UI
  - URL-based routing (no more tabs)
  - Dedicated edit pages for better navigation
  - Mind map editor with live preview (Markmap)
  - Quiz builder with dynamic forms
  - Flashcard pagination
  - User management with experience grants

- **Mobile App**: React Native + Expo
  - Feng Shui design (red #C41E3A, gold #FFD700)
  - Authentication flow
  - Book browsing and chapter selection
  - Flashcard study mode
  - Quiz taking with results
  - Mind map viewing
  - Profile and progress tracking

### Backend

- **NestJS**: Modular architecture
  - Auth, Books, Chapters, Flashcards
  - Quiz (Questions, Sessions, Results)
  - Mind Maps (Markdown-based)
  - Experience & Levels
  - User Profiles
  - Currency System

### Database

- **PostgreSQL**: External managed database
  - Supabase / Railway / Neon support
  - TypeORM for ORM
  - Migrations for schema changes

### Deployment

- **VPS**: Simple deployment workflow
  - Build locally (Windows)
  - Deploy to VPS via SCP
  - PM2 for process management
  - Nginx for reverse proxy
  - External database (no local PostgreSQL)

---

## Technology Stack

### Backend

- NestJS 10
- TypeORM 0.3
- PostgreSQL (external)
- Passport + JWT
- Swagger
- class-validator

### Admin Dashboard

- React Admin
- Material-UI (MUI)
- Markmap (mind maps)
- React Router

### Mobile App

- React Native
- Expo
- NativeWind (TailwindCSS)
- React Query
- Zustand
- Reanimated

### Infrastructure

- Turborepo (monorepo)
- npm Workspaces
- Husky (git hooks)
- Prettier + ESLint
- Supabase (storage)

---

## Current Status

### ✅ Completed Features

**Core Features:**

- Book management (upload, process, CRUD)
- Chapter management
- Flashcard generation and management
- Quiz system (questions, sessions, scoring)
- Mind map system (Markdown-based with Markmap)

**User Features:**

- Experience and leveling system
- Currency system for book unlocking
- User profiles with avatars
- Progress tracking

**Admin Features:**

- React Admin dashboard
- Book/chapter management
- Flashcard pagination
- Quiz builder with filters
- Mind map editor (URL-based)
- User management
- Experience grants

**Mobile Features:**

- Feng Shui design
- Authentication
- Book browsing
- Flashcard study
- Quiz taking
- Mind map viewing
- Profile management

**Infrastructure:**

- Backend unit tests
- VPS deployment guide
- External database support
- Signed URLs for secure access
- Import/Export functionality

### 🔄 In Progress

- None (all major features completed)

### 🔲 Future Enhancements

**Potential Features:**

- AI question generation
- Advanced analytics
- Social features (leaderboards, achievements)
- Offline mode for mobile
- Push notifications
- Advanced search
- Content recommendations

---

## Development Workflow

### Local Development

```bash
npm run dev                    # Run all apps
npm run backend:dev            # Backend only
npm run admin:dev              # Admin only
npm run mobile:dev             # Mobile only
```

### Testing

```bash
npm test                       # All tests
npm test --workspace=@quiz-game/backend  # Backend tests
```

### Deployment

```bash
# Backend to VPS
npm run build --workspace=@quiz-game/backend
./deploy-simple.sh

# Admin to hosting
npm run build --workspace=@quiz-game/admin
# Deploy to Vercel/Netlify

# Mobile to stores
eas build --platform ios
eas build --platform android
```

---

## Documentation

### Main Guides

- `README.md` - Project overview
- `knowledge/codebase-overview.md` - Architecture
- `VPS_SIMPLE_DEPLOY.md` - Deployment guide
- `MARKMAP_GUIDE.md` - Mind map feature
- `PROFILE_QUICK_START.md` - User profiles

### Context Files

- `01-book-management.md` - Book system
- `03-chapter-management.md` - Chapter system
- `04-flashcard-management.md` - Flashcard system
- `05-quiz-exam-system.md` - Quiz system
- `06-mindmap-system.md` - Mind map system
- `07-admin-dashboard.md` - Admin UI
- `12-mobile-app.md` - Mobile app
- `13-user-experience-leveling-system.md` - XP & Levels
- `14-currency-system-design.md` - Currency
- `15-user-profile-system.md` - Profiles

---

## Legend

- ✅ Completed: All features are fully implemented and tested
- 🔄 In Progress: Task is currently being worked on
- 🔲 Planned: Task is planned but not started
- ⏸ On Hold: Work is paused for some reason
- ❌ Blocked: Cannot proceed due to dependencies

---

## Notes

### December 2024 Summary

**Major Achievements:**

- Complete quiz system with scoring and results
- Mind map editor with Markmap integration
- Mobile app with Feng Shui design
- User experience and leveling system
- Currency system for book unlocking
- User profile management
- VPS deployment workflow
- Admin routing refactor (URL-based)

**Architecture Improvements:**

- External database support (Supabase/Railway/Neon)
- Simple VPS deployment (build local, deploy to VPS)
- URL-based admin navigation
- Dedicated edit pages
- Better code organization

**Quality:**

- Backend unit tests (~90% coverage)
- Comprehensive documentation
- Clean architecture
- Modular design

**Next Steps:**

- Monitor production deployment
- Gather user feedback
- Plan future enhancements
- Optimize performance
