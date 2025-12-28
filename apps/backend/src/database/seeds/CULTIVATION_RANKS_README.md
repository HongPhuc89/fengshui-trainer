# Cultivation Ranks System (Hệ Thống Tu Tiên)

## Overview

The Cultivation Ranks system is a gamification feature inspired by Vietnamese xianxia/cultivation novels. Users progress through 9 ranks as they earn experience points (XP) by completing various learning activities.

## The 9 Cultivation Ranks

| Rank | Vietnamese | English Translation       | XP Required | Theme Color              |
| ---- | ---------- | ------------------------- | ----------- | ------------------------ |
| 1    | Phàm Nhân  | Mortal                    | 0           | Gray (#808080)           |
| 2    | Luyện Khí  | Qi Refinement             | 100         | Royal Blue (#4169E1)     |
| 3    | Trúc Cơ    | Foundation Establishment  | 250         | Lime Green (#32CD32)     |
| 4    | Kim Đan    | Golden Core               | 500         | Gold (#FFD700)           |
| 5    | Nguyên Anh | Nascent Soul              | 1,000       | Dark Orange (#FF8C00)    |
| 6    | Hóa Thần   | Soul Transformation       | 2,000       | Orange Red (#FF4500)     |
| 7    | Luyện Hư   | Void Refinement           | 4,000       | Medium Purple (#9370DB)  |
| 8    | Đại Thừa   | Great Vehicle             | 8,000       | Deep Pink (#FF1493)      |
| 9    | Độ Kiếp    | Tribulation Transcendence | 15,000      | Dark Turquoise (#00CED1) |

## Cultivation Journey

### Early Stages (Ranks 1-3)

**Phàm Nhân → Luyện Khí → Trúc Cơ**

The beginning of the cultivation path. Users learn the basics and build their foundation. These ranks are achieved quickly to encourage new users.

- **Phàm Nhân** (Mortal): Every user starts here
- **Luyện Khí** (Qi Refinement): First milestone after completing initial activities
- **Trúc Cơ** (Foundation Establishment): Solid understanding of the basics

### Middle Stages (Ranks 4-6)

**Kim Đan → Nguyên Anh → Hóa Thần**

Major breakthroughs in cultivation. Users demonstrate consistent engagement and mastery.

- **Kim Đan** (Golden Core): Condensing knowledge into a golden core
- **Nguyên Anh** (Nascent Soul): Spiritual awakening, significant progress
- **Hóa Thần** (Soul Transformation): Divine transformation, deep understanding

### Advanced Stages (Ranks 7-9)

**Luyện Hư → Đại Thừa → Độ Kiếp**

The pinnacle of cultivation. Only the most dedicated users reach these ranks.

- **Luyện Hư** (Void Refinement): Mastering the void, approaching the Dao
- **Đại Thừa** (Great Vehicle): Near perfection, elite status
- **Độ Kiếp** (Tribulation Transcendence): Ultimate achievement, transcending mortal limits

## How to Earn XP

Users earn experience points through various activities:

### Learning Activities

- **Quiz Completion**: 0-50 XP (based on score)
- **Perfect Quiz Score**: +25 XP bonus
- **Chapter Completion**: 30 XP
- **Flashcard Study**: Variable XP

### Engagement Activities

- **Daily Login**: 10 XP + streak bonus (up to 50 XP)
- **Referral**: 100 XP per successful referral
- **Achievements**: Variable XP

## Rank Rewards

Each rank unlocks special rewards:

### Bonuses

- **XP Multiplier**: Increases from 1.0x to 1.5x
- **Daily Bonus**: Additional XP for daily login (0 to 50 XP)

### Features

- Custom avatars
- Advanced statistics
- Leaderboard access
- Premium content
- AI tutor access
- Exclusive features

### Badges

- Unique badges for each rank
- Special badges for achievements
- Hall of Fame entry for highest ranks

## Implementation Files

### Backend

- **Entity**: `apps/backend/src/modules/users/entities/user.entity.ts`
- **Experience Log**: `apps/backend/src/modules/experience/entities/user-experience-log.entity.ts`
- **Level Entity**: `apps/backend/src/modules/experience/entities/level.entity.ts`
- **Seed Data**: `apps/backend/src/database/seeds/cultivation-ranks.seed.ts`
- **Constants**: `apps/backend/src/shares/constants/cultivation-ranks.constant.ts`

### Database

- **Migration 1**: Add `experience_points` column to `users` table
- **Migration 2**: Create `user_experience_logs` table
- **Migration 3**: Create `levels` table with seed data

## API Endpoints

### User XP

- `GET /api/users/:userId/experience` - Get XP summary
- `GET /api/users/:userId/experience/logs` - Get XP history
- `POST /api/users/:userId/experience` - Award XP (admin)
- `POST /api/users/:userId/experience/recalculate` - Recalculate XP

### Levels

- `GET /api/levels` - Get all ranks
- `GET /api/levels/by-xp/:xp` - Get rank by XP amount

## Usage Examples

### Get User's Current Rank

```typescript
import { getRankByXP } from '@/database/seeds/cultivation-ranks.seed';

const userXP = 1250;
const currentRank = getRankByXP(userXP);
console.log(currentRank.title); // "Nguyên Anh"
```

### Calculate Progress to Next Rank

```typescript
import { calculateRankProgress } from '@/database/seeds/cultivation-ranks.seed';

const progress = calculateRankProgress(1250);
console.log(progress);
// {
//   currentRank: { level: 5, title: "Nguyên Anh", ... },
//   nextRank: { level: 6, title: "Hóa Thần", ... },
//   progress: 25.0,
//   xpRemaining: 750,
//   isMaxRank: false
// }
```

### Award XP to User

```typescript
await userExperienceService.awardXP(
  userId,
  ExperienceSourceType.QUIZ_ATTEMPT,
  50,
  quizId,
  'Completed quiz with 85% score',
);
```

## Design Philosophy

The cultivation theme was chosen to:

1. **Cultural Relevance**: Resonates with Vietnamese users familiar with xianxia novels
2. **Engaging Progression**: Creates a narrative of growth and achievement
3. **Motivation**: Encourages users to "level up" their knowledge
4. **Gamification**: Makes learning feel like an adventure
5. **Status Symbol**: Higher ranks become a badge of honor

## Future Enhancements

- **Realm Breakthroughs**: Special animations when advancing to next rank
- **Cultivation Techniques**: Unlock special study methods at higher ranks
- **Sect System**: Users can join learning groups (sects)
- **Dao Comprehension**: Additional progression system for mastery
- **Heavenly Tribulations**: Special challenges for rank advancement

---

**Note**: This system is designed to be fun and engaging while encouraging consistent learning and platform engagement. The cultivation theme adds a unique cultural flavor that sets this platform apart from generic gamification systems.
