# Quiz Game - Turborepo Monorepo

A full-stack Quiz Game application built with Turborepo monorepo architecture.

## 📁 Project Structure

```
/quiz-game
│
├── apps/
│   ├── backend/         → NestJS API Backend
│   ├── admin/           → React Admin Dashboard (Coming soon)
│   └── mobile/          → React Native Mobile App (Coming soon)
│
├── packages/
│   ├── ui/              → Shared React Components
│   ├── shared/          → Shared DTOs, Interfaces, Types
│   ├── utils/           → Shared Utility Functions
│   └── config/          → Shared Configuration Files
│
├── node_modules/
├── package.json         → Root package with workspaces
├── turbo.json          → Turborepo configuration
└── tsconfig.base.json  → Base TypeScript configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Install all dependencies for all workspaces
npm install
```

### Development

```bash
# Run all apps in development mode
npm run dev

# Run only backend
npm run backend:dev

# Build all apps
npm run build

# Lint all workspaces
npm run lint

# Run tests
npm run test
```

## 📦 Apps

### Backend (NestJS)

Located in `apps/backend/`

The main API server built with NestJS, TypeORM, and PostgreSQL.

**Features:**

- User authentication with JWT
- Book management
- Quiz generation
- File upload to Supabase
- RESTful API with Swagger documentation

**Run backend:**

```bash
npm run backend:dev
```

**Database migrations:**

```bash
npm run backend:migration:run
npm run backend:migration:generate
```

### Admin Dashboard

Located in `apps/admin/`

🚧 **Coming soon** - React-based admin interface

### Mobile App

Located in `apps/mobile/`

🚧 **Coming soon** - React Native mobile application

## 📚 Packages

### @quiz-game/ui

Shared React components used across frontend applications.

### @quiz-game/shared

Shared TypeScript types, interfaces, and DTOs used across all applications.

### @quiz-game/utils

Shared utility functions and helpers.

### @quiz-game/config

Shared configuration files (ESLint, TypeScript, etc.).

## 🔧 Turborepo

This monorepo uses [Turborepo](https://turbo.build/repo) for:

- Fast, incremental builds
- Smart caching
- Parallel execution
- Task pipelines

### Available Turbo Commands

```bash
# Build all apps and packages
npm run build

# Run all apps in dev mode
npm run dev

# Lint all workspaces
npm run lint

# Run tests across all workspaces
npm run test

# Type check all workspaces
npm run type-check
```

## 🌳 Environment Variables

Each app has its own `.env` file. See `.env_example` in each app directory.

### Backend Environment Variables

See `apps/backend/.env_example`

## 📝 Scripts

- `npm run dev` - Run all apps in development mode
- `npm run build` - Build all apps and packages
- `npm run lint` - Lint all workspaces
- `npm run test` - Run tests
- `npm run clean` - Clean all build artifacts and node_modules
- `npm run format` - Format all files with Prettier
- `npm run backend:dev` - Run only backend in dev mode
- `npm run backend:build` - Build only backend

## 🤝 Contributing

1. Create a new branch
2. Make your changes
3. Ensure all tests pass
4. Format code: `npm run format`
5. Submit a pull request

## 📄 License

UNLICENSED - Private project
