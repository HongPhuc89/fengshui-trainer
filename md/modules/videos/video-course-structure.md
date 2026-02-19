# Video Course Structure - Design Update

## Document Information
- **Updated**: 2026-02-17
- **Change**: Video module restructured to support course-based learning

---

## Overview

Video content is now organized as **Video Courses** (bộ khóa học), where each course contains **4-50 Video Lessons** (clips/bài học).

---

## Database Changes

### New Structure

```
VideoCategory
  └── VideoCourse (Khóa học)
        ├── Metadata (title, instructor, price, etc.)
        ├── VideoLesson 1 (Bài 1)
        ├── VideoLesson 2 (Bài 2)
        ├── ...
        └── VideoLesson N (Bài N, where N = 4-50)
              └── VideoQuiz (optional)
```

### Key Tables

1. **`videos_videocourse`** - Course information
   - Title, instructor, price
   - Total lessons count
   - Total duration
   - Level (BEGINNER, INTERMEDIATE, ADVANCED)

2. **`videos_videolesson`** - Individual lessons
   - Belongs to a course
   - Order within course
   - Video URL, transcript, summary
   - Slides, mindmap data
   - Can be marked as free (preview)

3. **`videos_usercoursepurchase`** - Purchase records
   - User purchases entire course
   - One purchase unlocks all lessons

4. **`videos_userlessonprogress`** - Progress tracking
   - Track progress per lesson
   - Overall course completion percentage

---

## API Changes

### Course Endpoints

- `GET /api/courses/` - List all courses
- `GET /api/courses/{slug}/` - Course detail with lessons list
- `GET /api/courses/{slug}/lessons/{lesson_slug}/` - Lesson detail with video
- `POST /api/courses/{slug}/lessons/{lesson_slug}/progress/` - Update progress
- `GET /api/courses/{slug}/progress/` - Overall course progress

### Purchase Flow

1. User browses courses
2. User purchases **entire course** (not individual lessons)
3. All lessons in course are unlocked
4. User can watch lessons in any order
5. Progress is tracked per lesson

---

## Features

### Course Level
- ✅ Course metadata (title, instructor, description)
- ✅ Trailer video (free preview)
- ✅ Total lessons count
- ✅ Total duration
- ✅ Difficulty level
- ✅ Overall progress tracking

### Lesson Level
- ✅ Sequential ordering
- ✅ Individual video content
- ✅ AI-generated transcript
- ✅ AI-generated summary (NotebookLM)
- ✅ Slides (PDF)
- ✅ Mindmap data
- ✅ Quizzes
- ✅ Progress tracking (watch time, completion)
- ✅ Watermarking
- ✅ Free preview lessons (optional)

---

## Example Course Structure

**Course**: "Kỳ Môn Độn Giáp Toàn Tập"
- **Total Lessons**: 45
- **Total Duration**: 45 hours
- **Price**: 1,990,000 VND

**Lessons**:
1. Bài 1: Giới thiệu Kỳ Môn (FREE preview) - 1h
2. Bài 2: Cơ bản về Bát Quái - 1.5h
3. Bài 3: Thiên Can Địa Chi - 1.2h
4. ...
45. Bài 45: Tổng kết và ứng dụng thực tế - 1h

---

## Migration Notes

### From Old Structure
- Old: Individual videos with separate purchases
- New: Courses with multiple lessons, single purchase

### Data Migration
1. Group existing videos into courses
2. Create course records
3. Link videos as lessons
4. Migrate purchase records to course purchases
5. Update progress tracking

---

## Implementation Impact

### Backend
- New models: `VideoCourse`, `VideoLesson`
- Updated models: `UserCoursePurchase`, `UserLessonProgress`
- New API endpoints for courses
- Updated serializers and viewsets

### Mobile (Flutter)
- Course list screen
- Course detail screen with lessons
- Lesson player screen
- Progress tracking UI

### Web (Vue.js)
- Course catalog page
- Course detail page
- Lesson player page
- Progress dashboard

---

## Benefits

1. **Better Organization**: Courses group related content
2. **Better Value**: Users buy complete learning paths
3. **Progress Tracking**: Clear course completion metrics
4. **Flexible Pricing**: Price per course, not per video
5. **Free Previews**: Some lessons can be free to attract users
6. **Scalability**: Easy to add more lessons to existing courses

---

*This structure aligns with modern e-learning platforms like Udemy, Coursera, etc.*
