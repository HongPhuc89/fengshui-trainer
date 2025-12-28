# Cursor Rules

## Directory and File Operations

### Before Creating Directories

1. **Always Check Existence**
   - Use `list_dir` tool to check if directory exists
   - Only create if directory doesn't exist
   - Log the result of the check

2. **Error Handling**
   - Handle "directory not found" gracefully
   - Provide clear error messages
   - Suggest next steps

### File Operations

1. **Check Before Modify**
   - Verify file existence before operations
   - Use appropriate tools for different operations
   - Handle errors appropriately

2. **File Creation**
   - Follow NestJS project structure (Modules, Controllers, Services)
   - Use consistent naming (`*.module.ts`, `*.service.ts`, `*.controller.ts`)
   - Add necessary documentation

## Testing Guidelines

### Test Structure

1. **Directory Organization**
   - Unit tests alongside source files (`*.spec.ts`)
   - E2E tests in `test/` directory
   - Use clear naming conventions

2. **Test Files**
   - Suffix with `.spec.ts` for unit tests
   - Suffix with `.e2e-spec.ts` for E2E tests
   - Match source file names

### Test Best Practices

1. **Independence**
   - Each test should be self-contained
   - Use `beforeEach` for setup
   - Mock dependencies using `jest.fn()` or custom mocks

2. **Coverage**
   - Test all code paths
   - Include edge cases
   - Test error conditions

## Code Style

### TypeScript/NestJS Standards

1. **Naming Conventions**
   - Classes: PascalCase (e.g., `BookService`)
   - Files: kebab-case (e.g., `book.service.ts`)
   - Interfaces: PascalCase (e.g., `BookInterface`)
   - Variables/Functions: camelCase

2. **Documentation**
   - Add JSDoc comments to all public methods
   - Document complex logic
   - Keep comments up to date

3. **NestJS Best Practices**
   - **Dependency Injection**: Always inject dependencies via constructor.
   - **DTOs**: Use DTOs for all controller inputs with `class-validator`.
   - **Async/Await**: Use async/await for all asynchronous operations.
   - **Environment Variables**: Access via `ConfigService`.
   - **Types**: Avoid `any` type; use interfaces or DTOs.

### Project Structure

1. **Modular Design**
   - Group related features into modules
   - Keep modules focused and single-purpose
   - Use shared modules for common functionality

2. **Code Organization**
   - Logical file structure
   - Related code together
   - Easy to navigate
