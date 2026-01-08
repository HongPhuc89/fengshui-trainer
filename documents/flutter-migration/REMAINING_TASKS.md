# Flutter Migration - Remaining Tasks

## Week 3: Learning Features (5 days) - NOT STARTED

### Flashcards System (2 days)

#### Models & Data Layer

- [ ] Create `Flashcard` model
  - id, chapterId, question, answer, difficulty
  - createdAt, updatedAt
- [ ] Create `FlashcardProgress` model
  - userId, flashcardId, masteryLevel, lastReviewed
  - reviewCount, correctCount
- [ ] Create `FlashcardsRepository`
  - getFlashcards(chapterId)
  - updateProgress(flashcardId, correct)
  - getProgress(chapterId)

#### State Management

- [ ] Create `FlashcardsProvider`
  - Load flashcards for chapter
  - Track current card index
  - Handle card flip
  - Update progress on answer

#### UI Implementation

- [ ] Create `FlashcardsPage`
  - Card flip animation
  - Swipe gestures (correct/incorrect)
  - Progress indicator
  - Mastery level display
- [ ] Spaced repetition algorithm
  - Calculate next review date
  - Sort cards by priority
  - Track mastery levels

---

### Quiz System (2 days)

#### Models & Data Layer

- [ ] Create `Quiz` model
  - id, chapterId, title, timeLimit
  - passingScore, totalQuestions
- [ ] Create `Question` model
  - id, quizId, type, content
  - options, correctAnswer, points
- [ ] Create `QuizAttempt` model
  - userId, quizId, score, answers
  - startedAt, completedAt
- [ ] Create `QuizRepository`
  - getQuiz(chapterId)
  - submitQuiz(quizId, answers)
  - getAttempts(quizId)

#### Question Types

- [ ] Multiple Choice
  - Single correct answer
  - Radio button UI
- [ ] True/False
  - Boolean answer
  - Simple button UI
- [ ] Ordering
  - Drag & drop items
  - Reorderable list UI

#### State Management

- [ ] Create `QuizProvider`
  - Load quiz questions
  - Track current question
  - Handle answer selection
  - Calculate score
  - Submit quiz

#### UI Implementation

- [ ] Create `QuizPage`
  - Question display
  - Answer options
  - Timer countdown
  - Progress bar
- [ ] Create `QuizResultsPage`
  - Score display
  - Correct/incorrect breakdown
  - Review answers
  - Retry option

---

### Mindmap Viewer (1 day)

#### Models & Data Layer

- [ ] Create `Mindmap` model
  - id, chapterId, title, data (JSON)
  - createdAt, updatedAt
- [ ] Create `MindmapNode` model
  - id, parentId, label, position
  - children, connections
- [ ] Create `MindmapRepository`
  - getMindmap(chapterId)

#### State Management

- [ ] Create `MindmapProvider`
  - Load mindmap data
  - Track zoom level
  - Track pan position

#### UI Implementation

- [ ] Create `MindmapPage`
  - Interactive canvas
  - Zoom controls (pinch, buttons)
  - Pan controls (drag)
  - Node rendering
  - Connection lines
- [ ] Consider using packages:
  - `flutter_mindmap` or
  - Custom Canvas implementation

---

## Week 4: Polish & Deploy (5 days) - NOT STARTED

### Profile Screen (1 day)

#### UI Implementation

- [ ] Create `ProfilePage`
  - User avatar display
  - Name, email display
  - Level & XP progress bar
  - Points display
  - Edit profile button
- [ ] Create `EditProfilePage`
  - Update name
  - Update avatar (image picker)
  - Update password
  - Save changes

#### State Management

- [ ] Create `ProfileProvider`
  - Load user profile
  - Update profile
  - Upload avatar

---

### Experience & Points System (1 day)

#### Models & Data Layer

- [ ] Create `ExperienceLog` model
  - userId, action, points, xp
  - createdAt
- [ ] Create `Achievement` model
  - id, title, description, icon
  - requirement, reward
- [ ] Create `ExperienceRepository`
  - getUserExperience()
  - getExperienceLogs()
  - getAchievements()

#### UI Implementation

- [ ] Create `ExperiencePage`
  - XP history
  - Level progression chart
  - Achievements list
  - Unlocked badges
- [ ] Add XP notifications
  - Toast on XP gain
  - Level up animation

---

### Daily Check-in (1 day)

#### Models & Data Layer

- [ ] Create `CheckIn` model
  - userId, date, streak
  - reward, createdAt
- [ ] Create `CheckInRepository`
  - checkIn()
  - getStreak()
  - getCheckInHistory()

#### UI Implementation

- [ ] Create `CheckInDialog`
  - Daily check-in button
  - Streak counter
  - Reward display
  - Calendar view
- [ ] Add check-in reminder
  - Daily notification
  - Home screen badge

---

### Testing & QA (1 day)

#### Unit Tests

- [ ] Auth tests
  - Login/logout
  - Token refresh
  - Storage
- [ ] Books tests
  - Load books
  - Load chapters
  - Error handling
- [ ] PDF tests
  - Load PDF
  - Track progress
  - Cache logic

#### Widget Tests

- [ ] Login page
- [ ] Books list
- [ ] PDF viewer
- [ ] Flashcards
- [ ] Quiz

#### Integration Tests

- [ ] Full auth flow
- [ ] Book → Chapter → PDF flow
- [ ] Quiz completion flow

---

### Build & Deploy (1 day)

#### Android

- [ ] Configure signing
  - Generate keystore
  - Update build.gradle
- [ ] Build APK
  - `flutter build apk --release`
- [ ] Test on device
- [ ] Upload to Play Store
  - Screenshots
  - Description
  - Privacy policy

#### iOS

- [ ] Configure signing
  - Apple Developer account
  - Certificates & provisioning
- [ ] Build IPA
  - `flutter build ipa --release`
- [ ] Test on device
- [ ] Upload to App Store
  - Screenshots
  - Description
  - Privacy policy

#### Web

- [ ] Build web
  - `flutter build web --release`
- [ ] Configure hosting
  - Firebase Hosting or
  - Vercel or
  - Netlify
- [ ] Deploy
- [ ] Test in browsers

---

## Priority Order

### High Priority (Must Have)

1. ✅ Authentication
2. ✅ Books & Chapters
3. ✅ PDF Viewer with tracking
4. Flashcards
5. Quiz system
6. Profile screen

### Medium Priority (Should Have)

7. Mindmap viewer
8. Experience/Points
9. Daily check-in
10. Testing

### Low Priority (Nice to Have)

11. Achievements
12. Social features
13. Offline mode for all features

---

## Estimated Timeline

- **Week 3 (Learning Features):** 5 days
  - Flashcards: 2 days
  - Quiz: 2 days
  - Mindmap: 1 day

- **Week 4 (Polish & Deploy):** 5 days
  - Profile: 1 day
  - Experience: 1 day
  - Check-in: 1 day
  - Testing: 1 day
  - Deploy: 1 day

**Total Remaining:** 10 days  
**Expected Completion:** ~2 weeks from now

---

## Dependencies Needed

### For Flashcards

- No new dependencies (use existing)

### For Quiz

- No new dependencies (use existing)

### For Mindmap

- `flutter_mindmap` or custom Canvas

### For Profile

- `image_picker` - Avatar upload
- `image_cropper` - Crop avatar

### For Notifications

- `flutter_local_notifications` - Daily reminders

---

## Notes

- Focus on core learning features first (Flashcards, Quiz)
- Mindmap can be simplified if time is tight
- Testing should be done incrementally, not all at end
- Deploy early to staging for user feedback
