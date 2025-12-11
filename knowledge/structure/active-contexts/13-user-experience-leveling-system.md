# User Experience & Leveling System

**Context ID**: 13
**Feature**: User Experience Points (XP) & Leveling System
**Status**: 🔲 Planned
**Created**: 2025-12-11
**Last Updated**: 2025-12-11

## Overview

This document describes the implementation of a comprehensive experience points (XP) and leveling system for users. The system tracks user progress through various activities, maintains an audit log of XP gains, and converts total XP into user levels.

**🎭 Theme**: The leveling system uses **Vietnamese Cultivation Ranks** (Tu Tiên) inspired by xianxia/cultivation novels, creating an engaging gamification experience where users progress from "Phàm Nhân" (Mortal) to "Độ Kiếp" (Tribulation Transcendence) as they learn and complete activities.

## Business Requirements

### Core Features

1. **Experience Points (XP) System**
   - Track total XP for each user
   - Award XP for various activities (challenges, lessons, missions, referrals)
   - Maintain complete audit log of all XP transactions

2. **Leveling System**
   - Convert total XP to user levels
   - Configurable level thresholds
   - Support for future level-based features (badges, rewards, unlocks)

3. **Activity Tracking**
   - Log all XP-earning activities with source tracking
   - Support multiple source types
   - Enable XP recalculation when needed

## Database Schema

### 1. Chapters Table Enhancement

**Table**: `chapters`

**New Column**:

```sql
point INTEGER NOT NULL DEFAULT 50
```

**Purpose**: Store the XP point value for each chapter's quiz

**Constraints**:

- NOT NULL with default 50
- Used to calculate XP rewards for quiz completion
- Can be customized per chapter based on difficulty

**Usage**:

- Easy chapters: 30-50 points
- Medium chapters: 50-100 points
- Hard chapters: 100-200 points

---

### 2. Users Table Enhancement

**Table**: `users`

**New Column**:

```sql
experience_points INTEGER NOT NULL DEFAULT 0
```

**Purpose**: Store the current total XP for each user

**Constraints**:

- NOT NULL with default 0
- Should never be negative
- Updated via XP log aggregation or direct increment

---

### 3. User Experience Logs Table

**Table**: `user_experience_logs`

**Purpose**: Audit log for all XP transactions, enabling history tracking and XP recalculation

**Columns**:

| Column Name   | Type        | Constraints                       | Description                                      |
| ------------- | ----------- | --------------------------------- | ------------------------------------------------ |
| `id`          | INTEGER     | PRIMARY KEY, AUTO_INCREMENT       | Unique log entry ID                              |
| `user_id`     | INTEGER     | NOT NULL, FOREIGN KEY → users(id) | User who earned XP                               |
| `source_type` | VARCHAR(50) | NOT NULL                          | Type of activity (enum)                          |
| `source_id`   | INTEGER     | NULLABLE                          | Reference ID of the source entity                |
| `xp`          | INTEGER     | NOT NULL                          | XP amount earned (can be negative for penalties) |
| `description` | TEXT        | NULLABLE                          | Optional description/reason                      |
| `created_at`  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()           | When XP was awarded                              |
| `updated_at`  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()           | Last update timestamp                            |

**Indexes**:

```sql
CREATE INDEX idx_user_experience_logs_user_id ON user_experience_logs(user_id);
CREATE INDEX idx_user_experience_logs_source ON user_experience_logs(source_type, source_id);
CREATE INDEX idx_user_experience_logs_created_at ON user_experience_logs(created_at);
```

**Source Types** (Enum):

```typescript
enum ExperienceSourceType {
  CHALLENGE = 'challenge', // Completing a challenge
  LESSON = 'lesson', // Completing a lesson/chapter
  QUIZ_ATTEMPT = 'quiz_attempt', // Completing a quiz
  QUIZ_PERFECT = 'quiz_perfect', // Perfect score on quiz
  FLASHCARD_STUDY = 'flashcard_study', // Studying flashcards
  DAILY_MISSION = 'daily_mission', // Daily login/activity
  REFERRAL = 'referral', // Referring new users
  ACHIEVEMENT = 'achievement', // Unlocking achievements
  MANUAL = 'manual', // Manual admin adjustment
}
```

**Example Records**:

```sql
-- User completes a quiz
INSERT INTO user_experience_logs (user_id, source_type, source_id, xp, description)
VALUES (1, 'quiz_attempt', 123, 50, 'Completed Chapter 1 Quiz with 80% score');

-- User gets perfect score bonus
INSERT INTO user_experience_logs (user_id, source_type, source_id, xp, description)
VALUES (1, 'quiz_perfect', 123, 25, 'Perfect score bonus');

-- Daily login
INSERT INTO user_experience_logs (user_id, source_type, source_id, xp, description)
VALUES (1, 'daily_mission', NULL, 10, 'Daily login streak: 5 days');

-- Referral
INSERT INTO user_experience_logs (user_id, source_type, source_id, xp, description)
VALUES (1, 'referral', 456, 100, 'Referred user ID 456');
```

---

### 4. Levels Table

**Table**: `levels`

**Purpose**: Define level thresholds and metadata for the leveling system

**Columns**:

| Column Name   | Type         | Constraints                 | Description                                 |
| ------------- | ------------ | --------------------------- | ------------------------------------------- |
| `id`          | INTEGER      | PRIMARY KEY, AUTO_INCREMENT | Unique level ID                             |
| `level`       | INTEGER      | NOT NULL, UNIQUE            | Level number (1, 2, 3, ...)                 |
| `xp_required` | INTEGER      | NOT NULL                    | Minimum XP required to reach this level     |
| `title`       | VARCHAR(100) | NULLABLE                    | Level title/name (e.g., "Novice", "Expert") |
| `icon`        | VARCHAR(255) | NULLABLE                    | Icon/badge URL or identifier                |
| `color`       | VARCHAR(20)  | NULLABLE                    | Display color (hex code)                    |
| `rewards`     | JSONB        | NULLABLE                    | Rewards unlocked at this level              |
| `created_at`  | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()     | Creation timestamp                          |
| `updated_at`  | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()     | Last update timestamp                       |

**Indexes**:

```sql
CREATE UNIQUE INDEX idx_levels_level ON levels(level);
CREATE INDEX idx_levels_xp_required ON levels(xp_required);
```

**Cultivation Ranks Progression** (Tu Tiên Theme):

| Level | XP Required | Rank (Vietnamese) | Description                                 |
| ----- | ----------- | ----------------- | ------------------------------------------- |
| 1     | 0           | Phàm Nhân         | Người phàm bắt đầu hành trình tu luyện      |
| 2     | 100         | Luyện Khí         | Tích lũy khí lực, rèn luyện cơ bản          |
| 3     | 250         | Trúc Cơ           | Xây dựng nền tảng vững chắc                 |
| 4     | 500         | Kim Đan           | Ngưng tụ kim đan, bước vào cảnh giới mới    |
| 5     | 1000        | Nguyên Anh        | Nguyên anh xuất thế, sức mạnh tăng vọt      |
| 6     | 2000        | Hóa Thần          | Nguyên thần hóa thành, thông suốt thiên địa |
| 7     | 4000        | Luyện Hư          | Luyện hóa hư không, tiến gần đạo            |
| 8     | 8000        | Đại Thừa          | Đại thành cảnh giới, cận kề đỉnh cao        |
| 9     | 15000       | Độ Kiếp           | Vượt qua thiên kiếp, thành tựu phi phàm     |

**Level Calculation Formula**:

```
XP for level N = XP_base * (growth_rate ^ (N - 1))

Example with XP_base = 100, growth_rate = 1.5:
Level 1: 0 XP
Level 2: 100 XP
Level 3: 250 XP (100 * 1.5^1 + 100)
Level 4: 475 XP (100 * 1.5^2 + 250)
...
```

**Rewards Structure** (JSONB):

```json
{
  "badges": ["first_level_up"],
  "features": ["custom_avatar"],
  "bonuses": {
    "xp_multiplier": 1.1,
    "daily_bonus": 5
  }
}
```

---

## Entity Relationships

```
users (1) ──< (N) user_experience_logs
users (1) ──< (1) levels (via calculated level)

levels: Independent reference table
```

## API Endpoints

### User XP Management

#### 1. Get User XP Summary

```
GET /api/users/:userId/experience
```

**Response**:

```json
{
  "user_id": 1,
  "total_xp": 1250,
  "current_level": {
    "level": 5,
    "title": "Expert",
    "xp_required": 1000,
    "icon": "expert-badge.png",
    "color": "#FFD700"
  },
  "next_level": {
    "level": 6,
    "title": "Master",
    "xp_required": 2000,
    "xp_remaining": 750,
    "progress_percentage": 33.3
  },
  "rank": 42,
  "total_users": 1000
}
```

#### 2. Get User XP History

```
GET /api/users/:userId/experience/logs
Query params: ?page=1&limit=20&source_type=quiz_attempt&start_date=2025-01-01
```

**Response**:

```json
{
  "data": [
    {
      "id": 123,
      "source_type": "quiz_attempt",
      "source_id": 45,
      "xp": 50,
      "description": "Completed Chapter 1 Quiz",
      "created_at": "2025-12-11T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "total_pages": 8
  },
  "summary": {
    "total_xp_earned": 1250,
    "by_source": {
      "quiz_attempt": 600,
      "lesson": 400,
      "daily_mission": 150,
      "referral": 100
    }
  }
}
```

**Note**: XP is automatically awarded through existing backend APIs (quiz submission, chapter completion, etc.). No manual XP award endpoint is needed.

### Levels Management

#### 3. Get All Levels

```
GET /api/levels
```

**Response**:

```json
{
  "data": [
    {
      "id": 1,
      "level": 1,
      "xp_required": 0,
      "title": "Phàm Nhân",
      "icon": "mortal.png",
      "color": "#808080"
    },
    {
      "id": 2,
      "level": 2,
      "xp_required": 100,
      "title": "Luyện Khí",
      "icon": "qi_refinement.png",
      "color": "#4169E1"
    }
  ]
}
```

#### 4. Get Level by XP

```
GET /api/levels/by-xp/:xp
```

**Example**: `GET /api/levels/by-xp/1250`

**Response**:

```json
{
  "current_level": {
    "level": 5,
    "title": "Nguyên Anh",
    "xp_required": 1000
  },
  "next_level": {
    "level": 6,
    "title": "Hóa Thần",
    "xp_required": 2000
  },
  "progress": {
    "xp_in_current_level": 250,
    "xp_to_next_level": 750,
    "percentage": 25.0
  }
}
```

### XP Integration in Existing APIs

XP is automatically awarded and level-up information is included in existing API responses:

#### Quiz Submission Response (Enhanced)

```
POST /api/quiz/submit
```

**Response** (with XP info):

```json
{
  "quiz_id": 123,
  "score": 85,
  "passed": true,
  "xp_earned": 42,
  "experience": {
    "total_xp": 1250,
    "level_up": false,
    "current_level": {
      "level": 5,
      "title": "Nguyên Anh"
    }
  }
}
```

**Response** (with level-up):

```json
{
  "quiz_id": 123,
  "score": 100,
  "passed": true,
  "xp_earned": 75,
  "experience": {
    "total_xp": 2030,
    "level_up": true,
    "previous_level": {
      "level": 5,
      "title": "Nguyên Anh"
    },
    "current_level": {
      "level": 6,
      "title": "Hóa Thần",
      "rewards": {
        "badges": ["divine_transformation"],
        "features": ["ai_tutor", "custom_quizzes"]
      }
    }
  }
}
```

#### Chapter Completion Response (Enhanced)

```
POST /api/chapters/:chapterId/complete
```

**Response**:

```json
{
  "chapter_id": 45,
  "completed": true,
  "xp_earned": 30,
  "experience": {
    "total_xp": 1280,
    "level_up": false,
    "current_level": {
      "level": 5,
      "title": "Nguyên Anh"
    }
  }
}
```

---

## Business Logic

### XP Award Rules

#### Quiz Completion

```typescript
// Get chapter point from quiz/chapter configuration
const chapterPoint = quiz.chapter.point || 50; // Default 50 if not configured
const perfectBonus = Math.floor(chapterPoint * 0.5); // 50% of chapter point

// Check if this is the first time user passes this chapter's quiz
const isFirstTimePass = await checkFirstTimePass(userId, chapterId);

if (isFirstTimePass && score >= passingScore) {
  // First time pass: Award full chapter point regardless of score
  const xpEarned = chapterPoint;

  awardXP(userId, 'quiz_attempt', quizId, xpEarned, 'First time passing chapter quiz');

  // Bonus for perfect score on first attempt
  if (score === 100) {
    awardXP(userId, 'quiz_perfect', quizId, perfectBonus, 'Perfect score on first attempt');
  }
} else {
  // Subsequent attempts: Award XP based on score percentage
  const scoreMultiplier = score / 100; // 0.0 to 1.0
  const xpEarned = Math.floor(chapterPoint * scoreMultiplier);

  awardXP(userId, 'quiz_attempt', quizId, xpEarned, `Completed quiz with ${score}% score`);

  // Bonus for perfect score
  if (score === 100) {
    awardXP(userId, 'quiz_perfect', quizId, perfectBonus, 'Perfect score bonus');
  }
}
```

**Dynamic XP Based on Chapter Points**:

- **Base XP** = Chapter point (configured per chapter, e.g., 50, 100, 200)
- **Perfect bonus** = 50% of chapter point
- **Lần đầu pass quiz**: Nhận **full chapter point** (không phụ thuộc vào điểm số, chỉ cần pass)
- **Lần sau**: Nhận XP theo % điểm số (score/100 × chapter point)

**Example** (Chapter point = 100):

- User A pass quiz lần đầu với 70%: Nhận 100 XP (first-time) + 0 bonus = **100 XP**
- User A làm lại quiz, đạt 85%: Nhận 85 XP (85% × 100) = **85 XP**
- User B pass quiz lần đầu với 100%: Nhận 100 XP (first-time) + 50 XP (perfect 50%) = **150 XP**
- User C làm lại quiz, đạt 100%: Nhận 100 XP (100% × 100) + 50 XP (perfect 50%) = **150 XP**

#### Lesson Completion

```typescript
const lessonXP = 30;
awardXP(userId, 'lesson', chapterId, lessonXP);
```

#### Daily Mission

```typescript
const dailyXP = 10;
const streakBonus = Math.min(streakDays * 2, 50); // Max 50 bonus
const totalXP = dailyXP + streakBonus;

awardXP(userId, 'daily_mission', null, totalXP, `Daily login streak: ${streakDays} days`);
```

#### Referral

```typescript
const referralXP = 100;
awardXP(referrerId, 'referral', newUserId, referralXP, `Referred user ID ${newUserId}`);
```

### Level Calculation

```typescript
function calculateUserLevel(totalXP: number, levels: Level[]): LevelInfo {
  // Levels sorted by xp_required DESC
  const sortedLevels = levels.sort((a, b) => b.xp_required - a.xp_required);

  // Find highest level user has reached
  const currentLevel = sortedLevels.find((level) => totalXP >= level.xp_required);

  // Find next level
  const nextLevel = levels.find((level) => level.xp_required > totalXP);

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      progress: 100,
      isMaxLevel: true,
    };
  }

  const xpInCurrentLevel = totalXP - currentLevel.xp_required;
  const xpNeededForNext = nextLevel.xp_required - currentLevel.xp_required;
  const progress = (xpInCurrentLevel / xpNeededForNext) * 100;

  return {
    currentLevel,
    nextLevel,
    progress: Math.round(progress * 10) / 10,
    xpRemaining: nextLevel.xp_required - totalXP,
    isMaxLevel: false,
  };
}
```

### XP Recalculation

```typescript
async function recalculateUserXP(userId: number): Promise<RecalculationResult> {
  // Sum all XP from logs
  const calculatedXP = await userExperienceLogRepository
    .createQueryBuilder('log')
    .select('SUM(log.xp)', 'total')
    .where('log.user_id = :userId', { userId })
    .getRawOne();

  const totalXP = calculatedXP.total || 0;

  // Update user's XP
  const user = await userRepository.findOne({ where: { id: userId } });
  const previousXP = user.experience_points;

  user.experience_points = totalXP;
  await userRepository.save(user);

  return {
    userId,
    previousXP,
    calculatedXP: totalXP,
    difference: totalXP - previousXP,
    logsCount: await userExperienceLogRepository.count({ where: { user_id: userId } }),
  };
}
```

---

## TypeScript Entities

### User Entity (Enhanced)

```typescript
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { UserExperienceLog } from './user-experience-log.entity';

@Entity('users')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  full_name: string;

  @Column({ type: 'integer', default: 0 })
  experience_points: number;

  @OneToMany(() => UserExperienceLog, (log) => log.user)
  experience_logs: UserExperienceLog[];

  // ... other existing fields
}
```

### UserExperienceLog Entity

```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

export enum ExperienceSourceType {
  CHALLENGE = 'challenge',
  LESSON = 'lesson',
  QUIZ_ATTEMPT = 'quiz_attempt',
  QUIZ_PERFECT = 'quiz_perfect',
  FLASHCARD_STUDY = 'flashcard_study',
  DAILY_MISSION = 'daily_mission',
  REFERRAL = 'referral',
  ACHIEVEMENT = 'achievement',
  MANUAL = 'manual',
}

@Entity('user_experience_logs')
@Index(['user_id'])
@Index(['source_type', 'source_id'])
@Index(['created_at'])
export class UserExperienceLog extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'integer' })
  user_id: number;

  @Column({
    type: 'enum',
    enum: ExperienceSourceType,
  })
  source_type: ExperienceSourceType;

  @Column({ type: 'integer', nullable: true })
  source_id: number;

  @Column({ type: 'integer' })
  xp: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => User, (user) => user.experience_logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

### Level Entity

```typescript
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('levels')
@Index(['level'], { unique: true })
@Index(['xp_required'])
export class Level extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'integer', unique: true })
  level: number;

  @Column({ type: 'integer' })
  xp_required: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  title: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string;

  @Column({ type: 'jsonb', nullable: true })
  rewards: {
    badges?: string[];
    features?: string[];
    bonuses?: {
      xp_multiplier?: number;
      daily_bonus?: number;
    };
  };
}
```

---

## Database Migrations

### Migration 1: Add point column to chapters

```typescript
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPointToChapters1733882900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'chapters',
      new TableColumn({
        name: 'point',
        type: 'integer',
        default: 50,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('chapters', 'point');
  }
}
```

### Migration 2: Add experience_points to users

```typescript
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddExperiencePointsToUsers1733883000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'experience_points',
        type: 'integer',
        default: 0,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'experience_points');
  }
}
```

### Migration 3: Create user_experience_logs table

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateUserExperienceLogs1733883100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_experience_logs',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'source_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'source_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'xp',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'user_experience_logs',
      new TableIndex({
        name: 'idx_user_experience_logs_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_experience_logs',
      new TableIndex({
        name: 'idx_user_experience_logs_source',
        columnNames: ['source_type', 'source_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_experience_logs',
      new TableIndex({
        name: 'idx_user_experience_logs_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'user_experience_logs',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_experience_logs');
  }
}
```

### Migration 4: Create levels table

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateLevels1733883200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'levels',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'level',
            type: 'integer',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'xp_required',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'rewards',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'levels',
      new TableIndex({
        name: 'idx_levels_level',
        columnNames: ['level'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'levels',
      new TableIndex({
        name: 'idx_levels_xp_required',
        columnNames: ['xp_required'],
      }),
    );

    // Insert default cultivation ranks
    await queryRunner.query(`
      INSERT INTO levels (level, xp_required, title, color) VALUES
      (1, 0, 'Phàm Nhân', '#808080'),
      (2, 100, 'Luyện Khí', '#4169E1'),
      (3, 250, 'Trúc Cơ', '#32CD32'),
      (4, 500, 'Kim Đan', '#FFD700'),
      (5, 1000, 'Nguyên Anh', '#FF8C00'),
      (6, 2000, 'Hóa Thần', '#FF4500'),
      (7, 4000, 'Luyện Hư', '#9370DB'),
      (8, 8000, 'Đại Thừa', '#FF1493'),
      (9, 15000, 'Độ Kiếp', '#00CED1');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('levels');
  }
}
```

---

## Seed Data & Constants

### Cultivation Ranks Seed Data

**File**: `apps/backend/src/database/seeds/cultivation-ranks.seed.ts`

This file contains the complete master data for all cultivation ranks with detailed information including:

- Level number and XP requirements
- Vietnamese rank titles and descriptions
- Color codes for UI display
- Icon identifiers
- Rewards configuration (badges, features, bonuses)

**Usage**:

```typescript
import { CULTIVATION_RANKS, getRankByXP, calculateRankProgress } from '@/database/seeds/cultivation-ranks.seed';

// Get all ranks
const allRanks = CULTIVATION_RANKS;

// Get rank by XP
const userRank = getRankByXP(1250); // Returns "Nguyên Anh" (level 5)

// Calculate progress
const progress = calculateRankProgress(1250);
// Returns: { currentRank, nextRank, progress: 25%, xpRemaining: 750, isMaxRank: false }
```

### Cultivation Ranks Constants

**File**: `apps/backend/src/shares/constants/cultivation-ranks.constant.ts`

Lightweight constants file for quick access to rank names, colors, and XP requirements:

```typescript
import { CULTIVATION_RANK_NAMES, getRankName, getRankColor } from '@/shares/constants/cultivation-ranks.constant';

// Get rank name by level
const rankName = getRankName(5); // "Nguyên Anh"

// Get rank color
const color = getRankColor(5); // "#FF8C00"

// All rank names array
const allNames = CULTIVATION_RANK_NAMES;
// ['Phàm Nhân', 'Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần', 'Luyện Hư', 'Đại Thừa', 'Độ Kiếp']
```

**Rank Names Reference**:

1. **Phàm Nhân** (Mortal) - 0 XP
2. **Luyện Khí** (Qi Refinement) - 100 XP
3. **Trúc Cơ** (Foundation Establishment) - 250 XP
4. **Kim Đan** (Golden Core) - 500 XP
5. **Nguyên Anh** (Nascent Soul) - 1,000 XP
6. **Hóa Thần** (Soul Transformation) - 2,000 XP
7. **Luyện Hư** (Void Refinement) - 4,000 XP
8. **Đại Thừa** (Great Vehicle) - 8,000 XP
9. **Độ Kiếp** (Tribulation Transcendence) - 15,000 XP

---

## Service Implementation

### UserExperienceService

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserExperienceLog, ExperienceSourceType } from './entities/user-experience-log.entity';
import { Level } from './entities/level.entity';

@Injectable()
export class UserExperienceService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserExperienceLog)
    private logRepository: Repository<UserExperienceLog>,
    @InjectRepository(Level)
    private levelRepository: Repository<Level>,
  ) {}

  async awardXP(
    userId: number,
    sourceType: ExperienceSourceType,
    xp: number,
    sourceId?: number,
    description?: string,
  ): Promise<{ log: UserExperienceLog; levelUp: boolean; newLevel?: Level }> {
    // Create log entry
    const log = this.logRepository.create({
      user_id: userId,
      source_type: sourceType,
      source_id: sourceId,
      xp,
      description,
    });
    await this.logRepository.save(log);

    // Update user's total XP
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const previousXP = user.experience_points;
    user.experience_points += xp;
    await this.userRepository.save(user);

    // Check for level up
    const previousLevel = await this.getLevelByXP(previousXP);
    const newLevel = await this.getLevelByXP(user.experience_points);
    const levelUp = newLevel.level > previousLevel.level;

    return {
      log,
      levelUp,
      newLevel: levelUp ? newLevel : undefined,
    };
  }

  async getUserXPSummary(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const currentLevel = await this.getLevelByXP(user.experience_points);
    const nextLevel = await this.getNextLevel(currentLevel.level);

    return {
      user_id: userId,
      total_xp: user.experience_points,
      current_level: currentLevel,
      next_level: nextLevel
        ? {
            ...nextLevel,
            xp_remaining: nextLevel.xp_required - user.experience_points,
            progress_percentage: this.calculateProgress(
              user.experience_points,
              currentLevel.xp_required,
              nextLevel.xp_required,
            ),
          }
        : null,
    };
  }

  async getLevelByXP(xp: number): Promise<Level> {
    const levels = await this.levelRepository.find({
      order: { xp_required: 'DESC' },
    });

    return levels.find((level) => xp >= level.xp_required) || levels[levels.length - 1];
  }

  async getNextLevel(currentLevel: number): Promise<Level | null> {
    return this.levelRepository.findOne({
      where: { level: currentLevel + 1 },
    });
  }

  private calculateProgress(currentXP: number, currentLevelXP: number, nextLevelXP: number): number {
    const xpInLevel = currentXP - currentLevelXP;
    const xpNeeded = nextLevelXP - currentLevelXP;
    return Math.round((xpInLevel / xpNeeded) * 1000) / 10;
  }

  async recalculateUserXP(userId: number) {
    const result = await this.logRepository
      .createQueryBuilder('log')
      .select('SUM(log.xp)', 'total')
      .where('log.user_id = :userId', { userId })
      .getRawOne();

    const calculatedXP = result.total || 0;
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const previousXP = user.experience_points;

    user.experience_points = calculatedXP;
    await this.userRepository.save(user);

    return {
      userId,
      previousXP,
      calculatedXP,
      difference: calculatedXP - previousXP,
    };
  }
}
```

---

## Integration Points

### 1. Quiz Completion Hook

```typescript
// In QuizService.submitQuiz()
async submitQuiz(userId: number, quizId: number, chapterId: number, answers: Answer[]) {
  // ... existing quiz grading logic ...

  const score = calculateScore(answers);
  const passingScore = 70; // or get from quiz config

  // Get chapter point from configuration
  const quiz = await this.quizRepository.findOne({
    where: { id: quizId },
    relations: ['chapter'],
  });
  const chapterPoint = quiz.chapter.point || 50; // Default 50 if not configured
  const perfectBonus = Math.floor(chapterPoint * 0.5); // 50% of chapter point

  // Check if this is the first time user passes this chapter's quiz
  const isFirstTimePass = await this.checkFirstTimePass(userId, chapterId);

  let xpEarned = 0;

  if (isFirstTimePass && score >= passingScore) {
    // First time pass: Award full chapter point
    xpEarned = chapterPoint;

    await this.userExperienceService.awardXP(
      userId,
      ExperienceSourceType.QUIZ_ATTEMPT,
      xpEarned,
      quizId,
      'First time passing chapter quiz',
    );

    // Bonus for perfect score on first attempt
    if (score === 100) {
      await this.userExperienceService.awardXP(
        userId,
        ExperienceSourceType.QUIZ_PERFECT,
        perfectBonus,
        quizId,
        'Perfect score on first attempt',
      );
      xpEarned += perfectBonus;
    }
  } else {
    // Subsequent attempts: Award XP based on score percentage
    xpEarned = Math.floor(chapterPoint * (score / 100));

    await this.userExperienceService.awardXP(
      userId,
      ExperienceSourceType.QUIZ_ATTEMPT,
      xpEarned,
      quizId,
      `Completed quiz with ${score}% score`,
    );

    // Bonus for perfect score
    if (score === 100) {
      await this.userExperienceService.awardXP(
        userId,
        ExperienceSourceType.QUIZ_PERFECT,
        perfectBonus,
        quizId,
        'Perfect score bonus',
      );
      xpEarned += perfectBonus;
    }
  }

  return { score, xpEarned, isFirstTimePass, chapterPoint };
}

// Helper method to check first-time pass
private async checkFirstTimePass(userId: number, chapterId: number): Promise<boolean> {
  // Check if user has any passed quiz attempts for this chapter
  const previousPassedAttempt = await this.quizAttemptRepository.findOne({
    where: {
      user_id: userId,
      chapter_id: chapterId,
      passed: true,
    },
  });

  return !previousPassedAttempt;
}
```

### 2. Chapter Completion Hook

```typescript
// In ChapterService.markComplete()
async markComplete(userId: number, chapterId: number) {
  // ... existing completion logic ...

  await this.userExperienceService.awardXP(
    userId,
    ExperienceSourceType.LESSON,
    30,
    chapterId,
    'Completed chapter',
  );
}
```

### 3. Daily Login Hook

```typescript
// In AuthService or DailyMissionService
async recordDailyLogin(userId: number) {
  const streakDays = await this.getLoginStreak(userId);
  const baseXP = 10;
  const streakBonus = Math.min(streakDays * 2, 50);

  await this.userExperienceService.awardXP(
    userId,
    ExperienceSourceType.DAILY_MISSION,
    baseXP + streakBonus,
    null,
    `Daily login streak: ${streakDays} days`,
  );
}
```

---

## Admin Dashboard Features

### XP Management Screen

**Features**:

1. View all users with XP and levels
2. Manually award/deduct XP
3. View XP history for any user
4. Recalculate XP for users
5. Export XP data

### Level Configuration Screen

**Features**:

1. CRUD operations for levels
2. Bulk import/export level configuration
3. Preview level progression curve
4. Configure rewards per level

---

## Mobile App Integration

### User Profile Screen

Display:

- Current level badge
- XP progress bar to next level
- Total XP earned
- Recent XP activities

### Gamification Elements

- Level-up animations
- XP gain notifications
- Daily mission reminders
- Leaderboard (top users by XP)

---

## Testing Strategy

### Unit Tests

1. **UserExperienceService**
   - Test XP awarding
   - Test level calculation
   - Test XP recalculation
   - Test level-up detection

2. **Level Calculation**
   - Test boundary conditions
   - Test max level handling
   - Test progress calculation

### Integration Tests

1. Quiz completion → XP award
2. Chapter completion → XP award
3. Daily login → XP award
4. Level up → rewards unlock

---

## Performance Considerations

1. **Indexing**: Proper indexes on user_id, source_type, created_at
2. **Caching**: Cache level data (rarely changes)
3. **Batch Operations**: Support bulk XP awards for events
4. **Async Processing**: Award XP asynchronously to avoid blocking main flow

---

## Future Enhancements

1. **Achievements System**: Unlock badges based on XP milestones
2. **Seasonal Events**: Bonus XP periods
3. **XP Multipliers**: Premium users get 2x XP
4. **Leaderboards**: Weekly/monthly XP rankings
5. **XP Decay**: Reduce XP for inactive users (optional)
6. **Prestige System**: Reset to level 1 with special badge after max level

---

## Implementation Checklist

### Phase 1: Database & Entities

- [ ] Create migration for `point` column in chapters table
- [ ] Create migration for `experience_points` column in users table
- [ ] Create migration for `user_experience_logs` table
- [ ] Create migration for `levels` table with seed data
- [ ] Update `Chapter` entity with point field
- [ ] Create `UserExperienceLog` entity
- [ ] Create `Level` entity
- [ ] Update `User` entity with XP field and relationship

### Phase 2: Services & Business Logic

- [ ] Create `UserExperienceService`
- [ ] Implement `awardXP()` method
- [ ] Implement `getUserXPSummary()` method
- [ ] Implement `getLevelByXP()` method
- [ ] Implement `recalculateUserXP()` method
- [ ] Create `LevelService` for level management

### Phase 3: API Endpoints

- [ ] `GET /api/users/:userId/experience` - Get XP summary
- [ ] `GET /api/users/:userId/experience/logs` - Get XP history with pagination
- [ ] `GET /api/levels` - Get all cultivation ranks
- [ ] `GET /api/levels/by-xp/:xp` - Get rank by XP amount

### Phase 4: Integration (Auto XP Award)

- [ ] Implement `checkFirstTimePass()` helper method in QuizService
- [ ] Enhance quiz submission API with first-time pass bonus logic
  - [ ] Get chapter point from chapter configuration
  - [ ] Award full chapter point for first-time pass (regardless of score)
  - [ ] Award score-based XP for subsequent attempts (score% × chapter point)
- [ ] Add perfect score bonus (50% of chapter point) for 100% quiz scores
- [ ] Enhance chapter completion API to award XP (30 XP)
- [ ] Implement daily login tracking with streak bonus
- [ ] Add XP award for flashcard study sessions
- [ ] Include level-up information in all API responses
- [ ] Add experience summary to response DTOs
- [ ] Return `isFirstTimePass` and `chapterPoint` in quiz submission response

### Phase 5: Admin Dashboard

- [ ] User XP management screen
- [ ] Level configuration screen
- [ ] XP history viewer
- [ ] Bulk XP operations

### Phase 6: Mobile App

- [ ] Display user level in profile
- [ ] XP progress bar component
- [ ] Level-up animation
- [ ] XP activity feed
- [ ] Leaderboard screen

### Phase 7: Testing

- [ ] Unit tests for UserExperienceService
- [ ] Unit tests for LevelService
- [ ] Integration tests for XP award flows
- [ ] E2E tests for level-up scenarios

### Phase 8: Documentation

- [ ] API documentation
- [ ] Admin user guide
- [ ] Mobile app user guide

---

## Timeline Estimate

- **Phase 1-2**: 2-3 days (Database + Core Services)
- **Phase 3**: 1-2 days (API Endpoints)
- **Phase 4**: 1-2 days (Integration)
- **Phase 5**: 2-3 days (Admin Dashboard)
- **Phase 6**: 2-3 days (Mobile App)
- **Phase 7**: 2-3 days (Testing)
- **Phase 8**: 1 day (Documentation)

**Total**: 11-17 days

---

## Success Metrics

1. **Technical**
   - All XP transactions logged correctly
   - Level calculation accuracy: 100%
   - API response time < 200ms
   - Zero data inconsistencies

2. **Business**
   - User engagement increase by 20%
   - Daily active users increase by 15%
   - Average session time increase by 25%
   - Quiz completion rate increase by 30%

---

## Notes

- XP system is designed to be extensible for future gamification features
- Audit log ensures data integrity and enables analytics
- Level system supports unlimited levels (can add more later)
- All XP awards are logged for transparency and debugging
- System supports negative XP for penalties if needed
