# Feature Summary

## What Is This Feature?

The AI Book Trainer (Quiz Game) is an educational platform built on Turborepo monorepo architecture that enables users to learn from books in an interactive way. Admins upload books, and the system processes them to create structured learning content including chapters, flashcards, mind maps, and quizzes. It transforms passive reading into active learning through AI-powered tools.

## How To Use This Feature?

### **Admin** (via API):

- Register and log in to the system
- Upload books (PDF, DOCX, TXT) via API
- Trigger book content processing
- Manage book metadata (Title, Author, Description, Language)
- Create and manage chapters manually or automatically
- Generate flashcards from chapter content using AI
- View and edit generated flashcards

### **User** (Future):

- Register/Log in via mobile/web app
- Browse available books
- Read books chapter by chapter
- Study using flashcards
- Take quizzes and exams with XP rewards
- Track learning progress and user level
- View rich mind maps with zoom and pan controls

## Solution / Architecture Design

### Backend Architecture

- **Turborepo Monorepo**: Organized structure with apps/ and packages/
- **NestJS Backend** (`apps/backend/`):
  - **Book Management**: File upload to Supabase, content extraction, chapter organization
  - **Chapter Management**: Create, update, delete chapters with content
  - **Flashcard System**: AI-powered flashcard generation from chapter content
  - **User System**: Authentication (JWT), role management (Admin, User), profile
  - **Upload Service**: Integration with Supabase storage for file management
  - **Content Processing**: PDF/DOCX parsing and text chunking using LangChain

### Frontend (Planned)

- **Admin Dashboard** (`apps/admin/`): React-based management interface
- **Mobile Apps**:
  - **Flutter App** (`apps/mobile_flutter/`): Primary learning app with PDF viewer, quizzes, and mind maps.
  - **React Native App** (`apps/mobile/`): Alternative/Legacy mobile interface.
- **Media Proxy Service**: Authenticated access to Supabase files with local disk caching.

### Shared Packages

- `@quiz-game/ui`: Shared UI components
- `@quiz-game/shared`: Common types, interfaces, DTOs
- `@quiz-game/utils`: Utility functions
- `@quiz-game/config`: Shared configurations

## Completed Features

- ✅ User Authentication (Register/Login with JWT)
- ✅ Book Upload & Management (CRUD operations)
- ✅ File Upload to Supabase Storage
- ✅ Content Extraction (PDF, DOCX, TXT parsing)
- ✅ Chapter Management (CRUD operations)
- ✅ Book Content Processing and Chunking
- ✅ Flashcard Management (CRUD operations)
- ✅ AI-Powered Flashcard Generation (using LangChain)
- ✅ Quiz/Exam System (Generation, Submission, Grading)
- ✅ User XP & Leveling System
- ✅ Secure Media Proxy with Local Caching
- ✅ Mobile PDF Viewer (Auto-scroll, Rotation hint)
- ✅ GitHub Actions CI/CD for Backend
- ✅ Amplitude Analytics Integration
- ✅ Turborepo Monorepo Setup
- ✅ API Documentation (Swagger)

## In Progress / Planned Features

- 🔄 Mind Map Visualization Enhancements (Native zoom/pan)
- ⏸ Study Session Management
- ⏸ Admin Dashboard UI (Custom implementation)
- ⏸ Offline Support for Books & Chapters

## Future Improvements

- **Advanced AI Integration**:
  - Connect with OpenAI/Gemini API for improved question generation
  - Contextual answer explanations
  - Adaptive learning paths based on user performance
- **Advanced Analytics**:
  - Detailed insights into user learning patterns
  - Performance metrics and recommendations
  - Learning time optimization
- **Gamification**:
  - Achievement badges and rewards
  - Leaderboards and competitive learning
  - Study streaks and milestones
- **Social Learning**:
  - Study groups and collaborative features
  - Discussion forums per book/chapter
  - Peer review and sharing
- **Enhanced Content**:
  - Support for audiobooks and podcasts
  - Video content integration
  - Interactive diagrams and visualizations
- **Offline Mode**:
  - Download books for offline study
  - Sync progress when back online
