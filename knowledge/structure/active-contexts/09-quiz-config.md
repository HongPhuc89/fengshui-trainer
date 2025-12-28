# Quiz Configuration System

**Status**: 🔲 Planned
**Priority**: High
**Created**: 2025-12-08
**Last Updated**: 2025-12-08

## Overview

Implement a comprehensive quiz configuration system that allows administrators to customize quiz behavior per chapter. This includes controlling the number of questions, time limits, passing scores, and difficulty distribution.

## Current State

### What Exists

- ✅ Quiz attempt flow (start quiz, submit answers, grading)
- ✅ Question bank with difficulty levels
- ✅ Question selection logic with hardcoded distribution (40% Easy, 40% Medium, 20% Hard)
- ✅ Basic quiz config entity (partially implemented in `QuizConfigService`)

### What's Missing

- ❌ Complete QuizConfig CRUD operations
- ❌ Admin UI for managing quiz configurations
- ❌ Default configuration creation when chapter is created
- ❌ Validation for configuration values
- ❌ Integration with chapter creation flow

## Requirements

### 1. Database Schema

**Entity**: `QuizConfig`

```typescript
@Entity('quiz_configs')
export class QuizConfig extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'chapter_id', unique: true })
  chapter_id: number;

  @ManyToOne(() => Chapter)
  @JoinColumn({ name: 'chapter_id' })
  chapter: Chapter;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 10 })
  questions_per_quiz: number;

  @Column({ type: 'int', default: 30 })
  time_limit_minutes: number;

  @Column({ type: 'int', default: 70 })
  passing_score_percentage: number;

  @Column({ type: 'int', default: 40 })
  easy_percentage: number;

  @Column({ type: 'int', default: 40 })
  medium_percentage: number;

  @Column({ type: 'int', default: 20 })
  hard_percentage: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  shuffle_questions: boolean;

  @Column({ type: 'boolean', default: true })
  shuffle_options: boolean;

  @Column({ type: 'boolean', default: true })
  show_results_immediately: boolean;

  @Column({ type: 'int', default: 0 })
  max_attempts: number; // 0 = unlimited
}
```

### 2. Backend Implementation

#### DTOs

**CreateQuizConfigDto**

```typescript
export class CreateQuizConfigDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  questions_per_quiz: number;

  @IsInt()
  @Min(1)
  @Max(300)
  time_limit_minutes: number;

  @IsInt()
  @Min(0)
  @Max(100)
  passing_score_percentage: number;

  @IsInt()
  @Min(0)
  @Max(100)
  easy_percentage: number;

  @IsInt()
  @Min(0)
  @Max(100)
  medium_percentage: number;

  @IsInt()
  @Min(0)
  @Max(100)
  hard_percentage: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsBoolean()
  @IsOptional()
  shuffle_questions?: boolean;

  @IsBoolean()
  @IsOptional()
  shuffle_options?: boolean;

  @IsBoolean()
  @IsOptional()
  show_results_immediately?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  max_attempts?: number;
}
```

#### Service Methods

**QuizConfigService**

- `create(chapterId: number, dto: CreateQuizConfigDto)`: Create config for chapter
- `findByChapterId(chapterId: number)`: Get config for chapter
- `update(chapterId: number, dto: UpdateQuizConfigDto)`: Update config
- `delete(chapterId: number)`: Delete config
- `createDefaultConfig(chapterId: number)`: Create default config
- `validateDifficultyDistribution(easy, medium, hard)`: Ensure percentages sum to 100

#### Controller Endpoints

**Admin Routes** (`/admin/chapters/:chapterId/quiz-config`)

- `POST /` - Create quiz config
- `GET /` - Get quiz config
- `PATCH /` - Update quiz config
- `DELETE /` - Delete quiz config

### 3. Admin UI

**Location**: `apps/admin/src/pages/QuizConfig.tsx`

**Features**:

- Form to configure quiz settings per chapter
- Real-time validation (e.g., difficulty percentages must sum to 100%)
- Preview of how quiz will behave with current settings
- Toggle switches for boolean options
- Number inputs with min/max validation
- Save/Cancel buttons
- Success/error notifications

**UI Components**:

```typescript
interface QuizConfigFormProps {
  chapterId: number;
  initialData?: QuizConfig;
  onSave: (data: QuizConfigDto) => void;
}

// Sections:
// 1. Basic Info (title, description)
// 2. Quiz Settings (questions count, time limit)
// 3. Difficulty Distribution (easy/medium/hard percentages with slider)
// 4. Scoring (passing percentage)
// 5. Behavior (shuffle, show results, max attempts)
```

### 4. Integration Points

#### Chapter Creation Hook

When a new chapter is created, automatically create a default quiz config:

```typescript
// In ChaptersService.create()
async create(bookId: number, dto: CreateChapterDto): Promise<Chapter> {
  const chapter = await this.chapterRepository.save(...);

  // Create default quiz config
  await this.quizConfigService.createDefaultConfig(chapter.id);

  return chapter;
}
```

#### Quiz Attempt Flow

Update `QuizAttemptsService.startQuiz()` to use config from database instead of hardcoded values.

### 5. Validation Rules

- **Difficulty Distribution**: `easy_percentage + medium_percentage + hard_percentage = 100`
- **Questions Per Quiz**: Must be <= total active questions in chapter
- **Time Limit**: Between 1-300 minutes
- **Passing Score**: Between 0-100%
- **Max Attempts**: 0 (unlimited) or positive integer

### 6. Default Configuration

```typescript
const DEFAULT_CONFIG = {
  title: 'Chapter Quiz',
  description: 'Test your knowledge of this chapter',
  questions_per_quiz: 10,
  time_limit_minutes: 30,
  passing_score_percentage: 70,
  easy_percentage: 40,
  medium_percentage: 40,
  hard_percentage: 20,
  is_active: true,
  shuffle_questions: false,
  shuffle_options: true,
  show_results_immediately: true,
  max_attempts: 0,
};
```

## Implementation Plan

### Phase 1: Backend Foundation

- [ ] Create migration for `quiz_configs` table
- [ ] Implement QuizConfig entity
- [ ] Create DTOs (Create, Update, Response)
- [ ] Implement QuizConfigService with CRUD methods
- [ ] Add validation for difficulty distribution
- [ ] Create admin controller endpoints
- [ ] Write unit tests for QuizConfigService

### Phase 2: Integration

- [ ] Update ChaptersService to create default config
- [ ] Modify QuizAttemptsService to use config from database
- [ ] Add config validation before starting quiz
- [ ] Handle edge cases (no config, inactive config)

### Phase 3: Admin UI

- [ ] Create QuizConfig form component
- [ ] Implement difficulty distribution slider
- [ ] Add real-time validation
- [ ] Create preview component
- [ ] Integrate with chapter detail page
- [ ] Add success/error handling

### Phase 4: Testing & Polish

- [ ] Integration tests for config flow
- [ ] E2E tests for admin UI
- [ ] Test edge cases (insufficient questions, etc.)
- [ ] Update documentation
- [ ] Migration guide for existing chapters

## Acceptance Criteria

- [ ] Quiz config can be created, read, updated, and deleted via API
- [ ] Default config is automatically created when chapter is created
- [ ] Admin UI allows easy configuration of all quiz settings
- [ ] Difficulty distribution validation works correctly
- [ ] Quiz attempt flow uses config from database
- [ ] All validation rules are enforced
- [ ] Unit tests pass with >80% coverage
- [ ] Documentation is updated

## Technical Considerations

### Performance

- Cache quiz config to avoid database queries on every quiz start
- Invalidate cache when config is updated

### Error Handling

- Graceful fallback to default config if config is missing
- Clear error messages for validation failures
- Handle race conditions (config deleted while quiz in progress)

### Future Enhancements

- Question pool rotation (don't repeat questions too soon)
- Adaptive difficulty (adjust based on user performance)
- Question type distribution (% of multiple choice, true/false, etc.)
- Time per question instead of total time
- Partial credit for multiple answer questions

## Dependencies

- ✅ Quiz/Exam System (completed)
- ✅ Chapter Management (completed)
- ✅ Admin Dashboard (completed)

## Related Files

### Backend

- `apps/backend/src/modules/quiz/entities/quiz-config.entity.ts`
- `apps/backend/src/modules/quiz/services/quiz-config.service.ts`
- `apps/backend/src/modules/quiz/controllers/admin-quiz-config.controller.ts`
- `apps/backend/src/modules/quiz/dtos/quiz-config.dto.ts`
- `apps/backend/src/migrations/XXXXXX-CreateQuizConfigsTable.ts`

### Admin UI

- `apps/admin/src/pages/QuizConfig.tsx`
- `apps/admin/src/components/QuizConfigForm.tsx`
- `apps/admin/src/components/DifficultyDistributionSlider.tsx`

### Tests

- `apps/backend/src/modules/quiz/services/quiz-config.service.spec.ts`
- `apps/backend/src/modules/quiz/controllers/admin-quiz-config.controller.spec.ts`

## Notes

- This feature is critical for making the quiz system flexible and customizable
- Should be implemented before releasing to production
- Consider adding analytics to track which configs lead to better learning outcomes
