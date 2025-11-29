# Active Context: 03 - Learning Interface API

## ✔️ Status

- **Current Status**: Not Started
- **Last Updated**: 2025-11-29

## ✏️ Business Requirements

- Users must be able to view the content of a book chapter by chapter.
- The system must track which chapters a user has completed.
- Users can take exams and see their results.
- Users can view their learning history.

## TODO List

- ❌ Task 1: Create `Progress` entity to track User-Book-Chapter relationship.
- ❌ Task 2: Implement endpoint to fetch chapter content (paginated or full text).
- ❌ Task 3: Implement endpoint to mark chapter as read.
- ❌ Task 4: Implement endpoint to submit exam answers and calculate score.
- ❌ Task 5: Implement endpoint to get user dashboard/stats.

## 📝 Active Decisions

- **Progress Tracking**: We will track progress at the Chapter level (Completed/Not Completed).
- **Exam Scoring**: Simple percentage score. Pass/Fail threshold (e.g., 70%).

## 🔍 Technical Solution / Design

- **Module**: `LearningModule`
- **Controller**: `LearningController`
- **Entities**: `UserProgress`, `ExamResult`.

### ⇅ Data Flow

1. User requests Chapter -> `LearningController` checks `UserProgress` -> Returns Content.
2. User submits Exam -> `ExamService` grades answers -> Saves `ExamResult` -> Updates `UserProgress` (if passed).

### 🔏 Security Patterns

- **Ownership**: Users can only see their own progress.
- **Access Control**: Users can only access books they are enrolled in (if we add enrollment logic later). For now, all books are public to logged-in users.

### ⌨️ Test Cases

- Get chapter content -> Should return text.
- Submit correct answers -> Should return 100% score and mark passed.
- Submit wrong answers -> Should return low score and mark failed.
