# Active Context: 01 - Book Management (Upload & Processing)

## ✔️ Status

- **Current Status**: In Progress
- **Last Updated**: 2025-11-30

## ✏️ Business Requirements

- **Access Control**: Only users with **Admin** or **Staff** roles can upload and manage books.
- **File Management**: Dedicated management for uploading book files (PDF/Text) and cover images.
- **File Parsing**: The system must parse uploaded files and extract text content.
- **Structure**: Content should be organized into chapters or sections.
- **Metadata**: Manage Title, Author, Description, Cover Image, and Status.

## TODO List

- 🔄 Task 1: Create `Book`, `Chapter`, and `UploadedFile` entities.
- 🔄 Task 2: Create `UploadModule` with `UploadController` for handling file/cover uploads.
- 🔄 Task 3: Implement file upload logic (Supabase Storage) and save to `UploadedFile` table.
- ❌ Task 4: Integrate **AdminJS** for managing `Book`, `User`, and `UploadedFile` resources. (REMOVED)
- ❌ Task 5: Implement PDF parsing service (e.g., using `pdf-parse`).
- ❌ Task 6: Implement text content extraction and chapter segmentation logic.
- ❌ Task 7: Create public API endpoints for fetching Books (User side).

## 📝 Active Decisions

- **File Storage**: Files will be stored in **Supabase Storage**.
- **Upload Strategy**: Decoupled upload. First upload file/cover to get an ID, then submit Book creation with IDs.
- **Parsing Strategy**: We will assume simple PDF structures for now. Complex layouts (multi-column) might need OCR or advanced libraries later.

## 🔍 Technical Solution / Design

### Database Schema

#### UploadedFile Entity

Inherits from `BaseEntity`.

| Column          | Type    | Constraints | Description                                  |
| :-------------- | :------ | :---------- | :------------------------------------------- |
| `id`            | Integer | PK          | Primary Key                                  |
| `user_id`       | Integer | FK -> Users | The user who uploaded the file               |
| `type`          | Enum    | Not Null    | Values: `book`, `cover`                      |
| `original_name` | Varchar | Not Null    | Original filename (e.g., "my-book.pdf")      |
| `filename`      | Varchar | Not Null    | Stored filename (e.g., "uuid-timestamp.pdf") |
| `path`          | Varchar | Not Null    | Supabase path or public URL                  |
| `mimetype`      | Varchar | Not Null    | MIME type (e.g., "application/pdf")          |
| `size`          | Integer | Not Null    | File size in bytes                           |

#### Book Entity

Inherits from `BaseEntity`.

| Column          | Type    | Constraints                  | Description                                 |
| :-------------- | :------ | :--------------------------- | :------------------------------------------ |
| `id`            | Integer | PK                           | Primary Key                                 |
| `user_id`       | Integer | FK -> Users                  | The user (Admin/Staff) who created the book |
| `title`         | Varchar | Not Null                     | Book title                                  |
| `author`        | Varchar | Nullable                     | Book author                                 |
| `cover_file_id` | Integer | Nullable, FK -> UploadedFile | Link to cover image file                    |
| `file_id`       | Integer | Nullable, FK -> UploadedFile | Link to book source file                    |
| `chapter_count` | Integer | Default: 0                   | Number of chapters extracted                |
| `status`        | Enum    | Default: 'draft'             | Values: `draft`, `published`, `disabled`    |

### Components

#### 1. UploadModule (New)

- **Controller**: `UploadController`
  - `POST /admin/upload`: Uploads a file. Requires `file` (multipart) and `type` (body: 'book' | 'cover'). Restricted to Admin/Staff.
- **Service**: `UploadService`
  - Handles file upload to **Supabase Storage**.
  - Saves file metadata to `UploadedFile` table.
  - Returns `UploadedFile` object (including ID).

#### 2. BookModule

- **Controller**: `BooksController` (Public API)
  - `GET /books`: Lists books (joins with UploadedFile to get URLs). Public/User.
  - `GET /books/:id`: Gets book detail. Public/User.
- **Service**: `BooksService` manages database interactions.
- **Service**: `FileParsingService` handles the extraction of text from `file_id` (resolves path from DB/Supabase).

### ⇅ Data Flow

1. **Upload Phase**:
   - Admin/Staff uploads File -> `UploadController` -> Supabase -> DB -> Returns `UploadedFile` (ID).

2. **Creation Phase**:
   - (Pending new admin UI implementation)

### 🔏 Security Patterns

- **Role-Based Access**:
  - `UploadController`: **Admin** or **Staff** only.
  - `BooksController` Read Operations (`/books/*`): Authenticated Users.
- **Route Prefixing**:
  - API endpoints at `/api`.
- **File Validation**:
  - Book File: `application/pdf`, `text/plain`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/epub+zip`, `text/markdown`.
  - Cover Image: `image/jpeg`, `image/png`.
- **Size Limit**:
  - Book File: Max 20MB.
  - Cover Image: Max 5MB.

### ⌨️ Test Cases

- **Upload**:
  - Upload valid cover (type='cover') -> Returns JSON with ID.
  - Upload valid PDF (type='book') -> Returns JSON with ID.
- **Public API**:
  - `GET /books/:id` as User -> Success.
