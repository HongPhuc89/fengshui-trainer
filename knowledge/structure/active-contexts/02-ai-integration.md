# Active Context: 02 - AI Question Generation

## ✔️ Status

- **Current Status**: Not Started
- **Last Updated**: 2025-11-29

## ✏️ Business Requirements

- The system must automatically generate quiz questions based on the content of a book chapter.
- Questions should be of multiple-choice type.
- The system should provide the correct answer and an explanation.
- Admins should be able to review and edit generated questions (optional for MVP).

## TODO List

- ❌ Task 1: Integrate OpenAI or Gemini API.
- ❌ Task 2: Design prompt templates for question generation.
- ❌ Task 3: Implement `ExamGenerationService`.
- ❌ Task 4: Create database schema for `Exam`, `Question`, `Answer`.
- ❌ Task 5: Implement API to trigger exam generation for a specific book/chapter.

## 📝 Active Decisions

- **AI Provider**: We will use OpenAI API (GPT-4o-mini or similar cost-effective model) or Gemini Flash.
- **Generation Trigger**: Exams are generated on-demand or pre-generated when a book is processed? -> _Decision: Pre-generate or generate on first access to save costs._

## 🔍 Technical Solution / Design

- **Service**: `AiService` wraps the LLM API calls.
- **Service**: `ExamService` manages the lifecycle of exams and questions.

### ⇅ Data Flow

1. User/Admin requests exam -> `ExamService`
2. `ExamService` fetches Chapter content -> DB
3. `ExamService` sends content + prompt -> `AiService`
4. `AiService` calls LLM -> Returns JSON with questions
5. `ExamService` saves Questions -> DB

### 🔏 Security Patterns

- **Rate Limiting**: Prevent abuse of the expensive AI generation endpoint.
- **Input Sanitization**: Ensure book content sent to AI doesn't contain injection attacks (though less critical for outbound).

### ⌨️ Test Cases

- Generate exam for a chapter -> Should return list of questions.
- Mock AI response -> Verify parsing of JSON response.
