# Tech Context – AI Book Trainer

## 🧰 Core Technologies

| Layer         | Technology         | Description                      |
| ------------- | ------------------ | -------------------------------- |
| Backend       | NestJS 10          | Progressive Node.js framework    |
| API Layer     | NestJS Controllers | RESTful API endpoints            |
| Database      | PostgreSQL         | Relational data storage          |
| ORM           | TypeORM            | Object-Relational Mapping        |
| Auth          | Passport + JWT     | Authentication and Authorization |
| Validation    | class-validator    | DTO validation                   |
| Documentation | Swagger (OpenAPI)  | API Documentation                |

## ⚙️ Development Environment

- **Node.js**: LTS version
- **Package manager**: `npm`
- **Local server**: `npm run start:dev`
- **Environment variables**: Managed via `.env` file (using `@nestjs/config`)
- **PostgreSQL**: Required for data storage

## 🧪 Testing Stack

- `Jest`: Test runner and assertion library
- `Supertest`: E2E testing for HTTP assertions
- `ts-jest`: TypeScript preprocessor for Jest

## 🚀 Deployment Target

- **Platform**: Docker / Cloud Provider (AWS/GCP/Azure)
- **Configuration**:
  - `NODE_ENV=production`
  - Environment variables injected at runtime
  - Database migrations run on startup

## 🗂 Dependencies & Tools

| Tool/Lib                   | Purpose                              |
| -------------------------- | ------------------------------------ |
| `@nestjs/common`           | Core NestJS decorators and utilities |
| `@nestjs/typeorm`          | TypeORM integration for NestJS       |
| `pg`                       | PostgreSQL driver                    |
| `passport`                 | Authentication middleware            |
| `@nestjs/jwt`              | JWT utilities                        |
| `bcrypt`                   | Password hashing                     |
| `class-validator`          | Decorator-based validation           |
| `class-transformer`        | Object transformation                |
| `@nestjs/swagger`          | API documentation generator          |
| `@supabase/supabase-js`    | Supabase client for file storage     |
| `@langchain/core`          | LangChain core for AI processing     |
| `@langchain/textsplitters` | Text splitting and chunking          |
| `mammoth`                  | DOCX file parsing                    |
| `pdf-parse`                | PDF file parsing                     |

## 🧩 Integrations

- **Supabase Storage**: Cloud storage for book files and uploaded content.
- **LangChain**: Text processing, chunking, and AI integration for flashcard generation.
- **AI Service**: (Planned) Integration with LLMs for advanced content generation.

## 📌 Configuration Notes

- `src/config/` contains configuration files.
- `ormconfig.ts` or `datasource.ts` for TypeORM configuration.
- `.env` file for secrets (DB credentials, JWT secret).

## NestJS Developer Guidelines

### Code Organization

1. **Modules**: Feature-based modules (e.g., `AuthModule`, `BookModule`).
2. **Controllers**: Handle incoming requests and return responses.
3. **Services**: Business logic.
4. **Entities**: Database models.
5. **DTOs**: Data Transfer Objects for request/response validation.

### Directory Structure (Turborepo Monorepo)

```
quiz-game/
├── apps/
│   ├── backend/            # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/   # Feature modules
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── user-credential/
│   │   │   │   ├── books/
│   │   │   │   ├── upload/
│   │   │   │   ├── admin/
│   │   │   │   ├── core/
│   │   │   │   └── typeorm/
│   │   │   ├── shares/    # Shared decorators, guards, filters, dtos
│   │   │   ├── migrations/ # Database migrations
│   │   │   ├── main.ts    # Entry point
│   │   │   └── app.module.ts # Root module
│   │   ├── config/         # Configuration files
│   │   ├── scripts/        # Utility scripts
│   │   └── package.json
│   ├── admin/              # Admin Dashboard (Placeholder)
│   └── mobile/             # Mobile App (Placeholder)
├── packages/
│   ├── ui/                 # Shared UI Components
│   ├── shared/             # Shared DTOs, Types, Interfaces
│   ├── utils/              # Shared Utility Functions
│   └── config/             # Shared Configuration
└── knowledge/              # Project Documentation
```

### Testing Practices

- **Unit Tests**: Write `.spec.ts` files for every service and controller.
- **E2E Tests**: Located in `test/` directory, testing full API flows.
- **Mocking**: Use `jest.mock` or custom mock providers for external dependencies.

### Example Test Setup

```typescript
describe('BookService', () => {
  let service: BookService;
  let repo: Repository<Book>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookService,
        {
          provide: getRepositoryToken(Book),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<BookService>(BookService);
    repo = module.get<Repository<Book>>(getRepositoryToken(Book));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```
