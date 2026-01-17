# Project Brief – AI Book Trainer (Quiz Game)

## 🧠 Purpose

The AI Book Trainer (Quiz Game) is an intelligent educational platform designed to transform static reading materials into interactive learning experiences. Built on a Turborepo monorepo architecture, it allows administrators to upload books (PDF/DOCX/Text), which are then processed to create structured learning paths with chapters, AI-generated flashcards, mind maps, and quizzes for users.

## 🧩 Core Features

### Implemented

- ✅ **Book Management (Admin)**: Upload, update, delete books with file storage on Supabase
- ✅ **Content Processing**: Automatic extraction and parsing of PDF, DOCX, TXT files
- ✅ **Chapter Management**: Manual and automatic chapter creation and organization
- ✅ **Flashcard System**: AI-powered flashcard generation from chapter content using LangChain
- ✅ **File Upload Service**: Integration with Supabase for cloud file storage
- ✅ **User Management**: Role-based access control with JWT authentication
- ✅ **Quiz/Exam System**: AI generation, automated grading, and XP rewards
- ✅ **Secure Media Access**: Media Proxy with local caching and authenticated URLs
- ✅ **Mobile Learning**: Flutter app with PDF reader, quizzes, and progress tracking
- ✅ **API Documentation**: Swagger/OpenAPI documentation at `/docs`

### In Progress

- 🔄 **Mind Map Visualization**: Native Flutter implementation with zoom/pan controls
- 🔄 **Advanced Analytics**: Learning patterns and performance tracking

### Planned

- ⏸ **Study Session Management**: Pomodoro-style learning sessions
- ⏸ **Offline Mode**: Local storage for books and learning progress
- ⏸ **Admin Dashboard UI**: Web-based content management tool

## 🎯 Goals

- **Enhance Learning Efficiency**: Make reading more interactive and measurable through flashcards, quizzes, and mind maps
- **Automate Content Generation**: Reduce the burden of creating manual study materials by using AI
- **Track Progress**: Provide users and admins with clear insights into learning achievements
- **Scalability**: Support a growing library of books and a large user base through monorepo architecture
- **Modern Architecture**: Leverage Turborepo for efficient development and deployment

## 🧑‍💻 Target Users

- **Administrators**: Content managers responsible for uploading and organizing educational materials
- **Learners/Students**: Individuals seeking to master the content of books through structured reading, flashcards, and quizzes
- **Organizations**: Companies or schools looking to provide training materials to employees or students

## 💡 Key Constraints

- **AI Accuracy**: Generated flashcards and questions must be relevant and accurate to the source material
- **File Format Support**: Must reliably handle common book formats (PDF, DOCX, TXT, and future formats)
- **Data Privacy**: User progress and exam results must be secure
- **Performance**: Content processing and AI generation should be efficient and scalable
- **Monorepo Management**: Maintain clean separation between apps and shared packages

## 🔭 Scope

This brief covers the core functionality:

### **MVP** (Completed)

- ✅ User Authentication (Admin/User) with JWT
- ✅ Book Upload and Storage (Supabase integration)
- ✅ Content Parsing (PDF, DOCX, TXT)
- ✅ Chapter Management (CRUD operations)
- ✅ AI-Powered Flashcard Generation (LangChain integration)
- ✅ Turborepo Monorepo Setup

### **Phase 2** (Completed/In Progress)

- ✅ Quiz/Exam System & XP Integration
- ✅ Secure Media Proxy Service
- ✅ Flutter Mobile App Foundation
- 🔄 Mind Map Visualization Enhancements
- 🔄 Automated CI/CD Pipelines
- ⏸ User Learning Progress Analytics
- ⏸ Study Session Management

### **Future Extensions**

- Advanced AI integration (OpenAI/Gemini) for deeper content understanding
- Social features (leaderboards, study groups, discussions)
- Admin Dashboard (Custom UI)
- Offline learning mode
- Gamification (badges, achievements, streaks)
- Support for audiobooks and video content
