# NestJS Developer Guidelines

## Unit Testing

- **Use Jest for all testing**
  - NestJS comes with Jest configured by default.
  - Use `.spec.ts` extension for unit tests.

- **Mock Dependencies**
  - Avoid using real database connections in unit tests.
  - Use `jest.fn()` to mock service methods and repository calls.
  - Use `Test.createTestingModule` to setup the testing module.

- **Test Structure**
  - **Arrange**: Setup mocks and test data.
  - **Act**: Call the method under test.
  - **Assert**: Check the return value and verify mocks were called.

- **Example Unit Test**:

```typescript
describe('BookService', () => {
  let service: BookService;
  let repository: Repository<Book>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookService,
        {
          provide: getRepositoryToken(Book),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BookService>(BookService);
    repository = module.get<Repository<Book>>(getRepositoryToken(Book));
  });

  it('should return an array of books', async () => {
    const result = await service.findAll();
    expect(result).toEqual([]);
    expect(repository.find).toHaveBeenCalled();
  });
});
```

## E2E Testing

- **Use Supertest**
  - Located in the `test/` directory.
  - Tests the entire request lifecycle (Controller -> Service -> DB).
  - Use a separate test database or transaction rollback to keep data clean.

## Code Style & Structure

- **Dependency Injection**
  - Always use constructor injection.
  - Avoid `new ClassName()` unless it's a DTO or Entity.

- **DTOs (Data Transfer Objects)**
  - Use DTOs for all controller inputs.
  - Use `class-validator` decorators (`@IsString()`, `@IsInt()`, etc.) for validation.
  - Use `class-transformer` to transform payloads.

- **Services**
  - Business logic goes here, not in Controllers.
  - Keep methods focused and single-purpose.

- **Controllers**
  - Handle HTTP requests and responses.
  - Delegate logic to Services.
  - Use standard HTTP status codes.

- **Entities**
  - Use TypeORM decorators (`@Entity`, `@Column`, `@OneToMany`).
  - Define relationships clearly.

## Error Handling

- **Use Built-in Exceptions**
  - `NotFoundException`, `BadRequestException`, `UnauthorizedException`.
  - Do not throw generic `Error` objects.

- **Global Filters**
  - Use global exception filters to standardize error responses.
