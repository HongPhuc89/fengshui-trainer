# Design Document: Question Illustrations

## Overview

This document outlines the design for adding illustration images to multiple-choice questions (MCQs) and other question types in the AI Book Trainer system.

## Objectives

- Allow each question to have an optional illustration image.
- Securely serve these images via the existing Media Proxy.
- Support seamless display in mobile and web applications.

## Technical Design

### 1. Database Schema Updates

#### Entity: `Question`

Add a new field to link the question to an uploaded file.

```typescript
@Column({ name: 'illustration_file_id', nullable: true })
illustration_file_id: number;

@ManyToOne(() => UploadedFile)
@JoinColumn({ name: 'illustration_file_id' })
illustration: UploadedFile;
```

### 2. API Changes

#### DTOs

- **`CreateQuestionDto`**:
  ```typescript
  @ApiPropertyOptional({ description: 'Illustration file ID from UploadedFile entity' })
  @IsOptional()
  @IsInt()
  illustration_file_id?: number;
  ```
- **`UpdateQuestionDto`**:
  ```typescript
  @ApiPropertyOptional({ description: 'Illustration file ID from UploadedFile entity' })
  @IsOptional()
  @IsInt()
  illustration_file_id?: number;
  ```
- **`QuestionResponseDto`**: The backend currently returns the raw entity. We should ensure the `illustration` relation is joined in the controller/service.

#### Question Service

- When creating/updating a question, validate the existence of `illustration_file_id`.
- Ensure that the user has permission to use the file (if applicable).

### 3. Media Serving Strategy

Illustrations will be served through the **Media Proxy API**:
`GET /api/media/:id`

This ensures:

- ✅ Authentication is required to view question images.
- ✅ Local caching on the backend for performance.
- ✅ No direct exposure of Supabase URLs.

### 4. Client-side Integration (Mobile & Web)

#### Layout Design

The illustration should be displayed between the `question_text` and the `options` list.

**Proposed Mobile UI Layout:**

1. Question Header (Difficulty, Points)
2. Question Text
3. **Illustration Image** (Full width, responsive height, tap to zoom)
4. Interactive Options (A, B, C, D)
5. Feedback/Explanation (After submission)

### 5. Benefits

- **Visual Learning**: Helps users grasp complex concepts through diagrams or photos.
- **Engagement**: Makes quizzes more interactive and less text-heavy.
- **Scalability**: Uses the existing robust file upload and media proxy systems.

## Implementation Tasks

- [ ] Backend: Update `Question` entity and run migrations.
- [ ] Backend: Update `QuestionModule` DTOs and Services.
- [ ] Mobile: Modify `QuizPage` to fetch and render the illustration if present.
- [ ] Admin: Update question creation interface to allow selecting/uploading an image.
