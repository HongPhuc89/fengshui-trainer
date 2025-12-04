# Turborepo Migration Guide

## ✅ Completed Steps

### 1. Structure Created

- ✅ Created Turborepo monorepo structure
- ✅ Created `apps/backend/` with all backend code
- ✅ Created placeholder `apps/admin/`
- ✅ Created placeholder `apps/mobile/`
- ✅ Created `packages/ui/`, `packages/shared/`, `packages/utils/`, `packages/config/`

### 2. Configuration Files

- ✅ Created `turbo.json` - Turborepo configuration
- ✅ Created `tsconfig.base.json` - Base TypeScript config
- ✅ Updated root `package.json` with workspaces
- ✅ Created individual `package.json` for each app/package
- ✅ Updated `.gitignore` for monorepo

### 3. Backend Migration

- ✅ Copied `src/` to `apps/backend/src/`
- ✅ Copied `config/` to `apps/backend/config/`
- ✅ Copied `scripts/` to `apps/backend/scripts/`
- ✅ Copied configuration files (nest-cli.json, jest.config.js, etc.)
- ✅ Copied `.env` and `.env_example`

## 🔄 Next Steps

### 1. Install Dependencies

```bash
# Remove old node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Install all dependencies for all workspaces
npm install
```

### 2. Test Backend

```bash
# Test if backend runs correctly
npm run backend:dev

# Should start on http://localhost:3000
```

### 3. Clean Up Old Files (Optional)

After confirming everything works, you can remove old root-level files:

```bash
# Remove old source files (they're now in apps/backend/)
rm -rf src config scripts datasource.ts nest-cli.json jest.config.js

# Keep knowledge/ folder if you still need it
# Or move it to apps/backend/knowledge/
```

### 4. Update Knowledge Documentation

Update any documentation in `knowledge/` to reflect the new structure.

### 5. Update CI/CD (if any)

Update your CI/CD pipelines to work with Turborepo:

- Use `npm run build` instead of `npm run build` in root
- Update paths from `src/` to `apps/backend/src/`

## 📝 Important Notes

### Running Commands

**Root level (affects all workspaces):**

```bash
npm run dev          # Run all apps
npm run build        # Build all apps
npm run lint         # Lint all
```

**Backend specific:**

```bash
npm run backend:dev                    # Run backend dev server
npm run backend:build                  # Build backend
npm run backend:migration:run          # Run migrations
npm run backend:migration:generate     # Generate migrations
```

**Workspace specific:**

```bash
# Run any script in a specific workspace
npm run <script> --workspace=@quiz-game/backend
```

### File Paths

- Backend code is now in `apps/backend/src/`
- Migrations are in `apps/backend/src/migrations/`
- Shared code will go in `packages/shared/src/`

### Environment Variables

- Backend `.env` is in `apps/backend/.env`
- Each app can have its own `.env` file

### Database Migrations

Migration commands now need to be run from backend workspace:

```bash
npm run backend:migration:run
npm run backend:migration:generate
```

Or directly:

```bash
cd apps/backend
npm run migration:run
```

## 🚀 Future Development

### Adding Shared Code

When you want to share code between apps:

1. **Types/Interfaces** → Move to `packages/shared/src/`
2. **Utilities** → Move to `packages/utils/src/`
3. **UI Components** → Move to `packages/ui/src/`

Example:

```typescript
// In packages/shared/src/types/user.types.ts
export interface User {
  id: string;
  email: string;
  // ...
}

// In packages/shared/src/index.ts
export * from './types/user.types';

// In apps/backend/src/modules/users/users.service.ts
import { User } from '@quiz-game/shared';
```

### Adding Admin App

When ready to build admin:

```bash
cd apps/admin
npx -y create-vite@latest ./ --template react-ts
# or
npx -y create-next-app@latest ./ --typescript
```

### Adding Mobile App

When ready to build mobile:

```bash
cd apps/mobile
npx -y create-expo-app@latest ./ --template
```

## 🐛 Troubleshooting

### "Cannot find module"

Make sure all dependencies are installed:

```bash
npm install
```

### Backend won't start

1. Check if `.env` file exists in `apps/backend/`
2. Check if database is running
3. Try running migrations: `npm run backend:migration:run`

### TypeScript errors

1. Check if `tsconfig.json` extends `../../tsconfig.base.json`
2. Run type check: `npm run type-check`

### Turbo cache issues

Clear Turbo cache:

```bash
npx turbo clean
# or
rm -rf .turbo
```

## 📚 Resources

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [npm Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [Monorepo Best Practices](https://monorepo.tools/)
