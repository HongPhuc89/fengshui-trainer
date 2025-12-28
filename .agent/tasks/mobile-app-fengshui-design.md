# Task: Quiz Game Mobile App - Feng Shui Design

**Status**: 🔲 Planned
**Priority**: High
**Created**: 2025-12-08
**Estimated Time**: 3-4 weeks

## Mục tiêu

Xây dựng mobile app React Native cho hệ thống Quiz Game với giao diện đẹp mắt theo phong cách phong thủy Việt Nam (tham khảo design màu đỏ-vàng may mắn).

## Context

- **Backend**: NestJS API đã hoàn thiện (running on port 3000)
- **Features**: Books, Chapters, Quiz, Flashcards, Mind Maps
- **Current State**: Mobile folder chỉ có placeholder
- **Goal**: Tạo mobile app với web development build (mobile-first UI)

## Tech Stack

### Core

- **React Native + Expo** (hỗ trợ iOS, Android, Web)
- **TypeScript**
- **Expo Router** (file-based routing)

### Styling & Animation

- **NativeWind** (TailwindCSS for React Native) - recommended
- **React Native Reanimated** (smooth animations)
- **Lottie** (complex animations)
- **React Native Skia** (optional - for advanced graphics)

### State & Data

- **TanStack Query (React Query)** - API data fetching & caching
- **Zustand** - lightweight state management
- **AsyncStorage** - local storage
- **MMKV** - fast key-value storage (optional)

### UI Components

- **React Native Paper** hoặc **NativeBase** (component library)
- Custom components với Feng Shui design system

### Backend Integration

- **Axios** - HTTP client
- **React Query** - API state management
- Sử dụng existing backend API

## Design System - Phong Thủy Style

### Color Palette

```typescript
// colors.ts
export const colors = {
  // Primary - Màu may mắn
  primary: {
    red: '#C41E3A', // Đỏ may mắn chính
    redDark: '#8B0000', // Đỏ đậm
    redLight: '#E63946', // Đỏ sáng
  },

  // Secondary - Vàng kim
  secondary: {
    gold: '#FFD700', // Vàng kim
    goldDark: '#DAA520', // Vàng đậm
    goldLight: '#FFF8DC', // Vàng nhạt/kem
  },

  // Accent - Màu phụ
  accent: {
    jade: '#00A86B', // Xanh ngọc
    brown: '#8B4513', // Nâu gỗ
    cream: '#FFF8DC', // Kem
  },

  // Gradients
  gradients: {
    lucky: ['#C41E3A', '#8B0000'], // Gradient đỏ
    gold: ['#FFD700', '#FFA500'], // Gradient vàng
    redGold: ['#C41E3A', '#FFD700'], // Đỏ sang vàng
    jade: ['#00A86B', '#006B4E'], // Xanh ngọc
  },

  // Neutral
  neutral: {
    white: '#FFFFFF',
    black: '#000000',
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
  },

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};
```

### Typography

```typescript
// typography.ts
export const fonts = {
  // Vietnamese fonts
  heading: 'UTM-Avo', // Tiêu đề
  body: 'SVN-Gilroy', // Nội dung
  decorative: 'UTM-Cookies', // Trang trí

  // Fallback to system fonts
  system: {
    ios: 'SF Pro Display',
    android: 'Roboto',
    default: 'System',
  },
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
};

export const fontWeights = {
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};
```

### Spacing & Layout

```typescript
// spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};
```

## Project Structure

```
apps/mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Auth group
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/                   # Main tabs
│   │   ├── _layout.tsx           # Tab layout
│   │   ├── index.tsx             # Home/Books
│   │   ├── library.tsx           # My Library
│   │   ├── progress.tsx          # Progress/Stats
│   │   └── profile.tsx           # Profile
│   ├── book/
│   │   └── [id].tsx              # Book detail
│   ├── chapter/
│   │   └── [id].tsx              # Chapter detail
│   ├── quiz/
│   │   ├── [id]/
│   │   │   ├── start.tsx         # Quiz start screen
│   │   │   ├── play.tsx          # Quiz playing
│   │   │   └── result.tsx        # Quiz result
│   ├── flashcard/
│   │   └── [chapterId].tsx       # Flashcard session
│   ├── mindmap/
│   │   └── [chapterId].tsx       # Mind map viewer
│   ├── _layout.tsx               # Root layout
│   └── +not-found.tsx
│
├── src/
│   ├── components/               # Reusable components
│   │   ├── ui/                   # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Progress.tsx
│   │   │   └── GradientBackground.tsx
│   │   ├── quiz/
│   │   │   ├── QuizCard.tsx
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── OptionButton.tsx
│   │   │   ├── QuizTimer.tsx
│   │   │   └── ScoreDisplay.tsx
│   │   ├── flashcard/
│   │   │   ├── FlashCard.tsx
│   │   │   ├── CardFlip.tsx
│   │   │   └── CardStack.tsx
│   │   ├── book/
│   │   │   ├── BookCard.tsx
│   │   │   ├── ChapterList.tsx
│   │   │   └── BookCover.tsx
│   │   └── common/
│   │       ├── Header.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── EmptyState.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── services/                 # API services
│   │   ├── api.ts                # Axios instance
│   │   ├── auth.service.ts
│   │   ├── books.service.ts
│   │   ├── chapters.service.ts
│   │   ├── quiz.service.ts
│   │   ├── flashcards.service.ts
│   │   └── mindmap.service.ts
│   │
│   ├── hooks/                    # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useBooks.ts
│   │   ├── useQuiz.ts
│   │   ├── useFlashcards.ts
│   │   └── useTheme.ts
│   │
│   ├── stores/                   # Zustand stores
│   │   ├── authStore.ts
│   │   ├── quizStore.ts
│   │   └── settingsStore.ts
│   │
│   ├── constants/                # Constants
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── config.ts
│   │
│   ├── utils/                    # Utilities
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   ├── storage.ts
│   │   └── haptics.ts
│   │
│   └── types/                    # TypeScript types
│       ├── api.types.ts
│       ├── quiz.types.ts
│       └── navigation.types.ts
│
├── assets/
│   ├── images/
│   ├── fonts/
│   ├── animations/               # Lottie files
│   └── icons/
│
├── app.json                      # Expo config
├── package.json
├── tsconfig.json
├── tailwind.config.js            # NativeWind config
└── README.md
```

## Core Features & Screens

### 1. Authentication Flow

#### Login Screen

- [ ] Gradient background (red-gold)
- [ ] Logo/app name với font decorative
- [ ] Email/password inputs
- [ ] "Đăng nhập" button với animation
- [ ] "Quên mật khẩu?" link
- [ ] "Đăng ký" link
- [ ] Social login (optional)

#### Register Screen

- [ ] Similar design to login
- [ ] Name, email, password fields
- [ ] Password strength indicator
- [ ] Terms & conditions checkbox

### 2. Home/Books Screen (Tab 1)

#### Header

- [ ] Gradient background
- [ ] Welcome message: "Xin chào, [Name]"
- [ ] Search bar
- [ ] Notification icon

#### Featured Section

- [ ] Horizontal scroll của featured books
- [ ] Book cards với:
  - Cover image
  - Title
  - Author
  - Progress bar (nếu đã bắt đầu)
  - Badge (New, Popular, Completed)

#### Categories

- [ ] Grid layout của categories
- [ ] Icons + labels
- [ ] Màu sắc phong thủy cho mỗi category

#### All Books

- [ ] List/Grid toggle
- [ ] Filter & sort options
- [ ] Infinite scroll

### 3. Book Detail Screen

#### Header

- [ ] Cover image (large)
- [ ] Title, author, description
- [ ] Stats: chapters, questions, completion rate
- [ ] "Bắt đầu học" button (gradient)

#### Chapters List

- [ ] Expandable/collapsible
- [ ] Each chapter shows:
  - Chapter number & title
  - Progress (%)
  - Quiz score (if completed)
  - Lock icon (if locked)
  - Checkmark (if completed)

#### Actions

- [ ] Start/Continue reading
- [ ] Take quiz
- [ ] Review flashcards
- [ ] View mind map

### 4. Chapter Detail Screen

#### Content

- [ ] Chapter title
- [ ] Reading content (scrollable)
- [ ] Progress indicator

#### Quick Actions (Bottom)

- [ ] Quiz button
- [ ] Flashcards button
- [ ] Mind map button
- [ ] Bookmark button

### 5. Quiz Flow

#### Quiz Start Screen

- [ ] Quiz info card:
  - Number of questions
  - Time limit
  - Passing score
  - Difficulty distribution
- [ ] "Bắt đầu" button với animation
- [ ] Previous attempts (if any)

#### Quiz Playing Screen

- [ ] Header:
  - Timer (countdown)
  - Question counter (1/10)
  - Exit button
- [ ] Question card:
  - Question text
  - Question type badge
  - Difficulty indicator (stars)
- [ ] Options:
  - Radio buttons (single choice)
  - Checkboxes (multiple choice)
  - True/False buttons
- [ ] Navigation:
  - Previous/Next buttons
  - Question grid (overview)
- [ ] Submit button (when all answered)

#### Quiz Result Screen

- [ ] Celebration animation (if passed)
- [ ] Score display:
  - Large percentage (circular progress)
  - Points earned
  - Time taken
  - Pass/Fail status
- [ ] Question review:
  - Correct/incorrect breakdown
  - Review answers button
- [ ] Actions:
  - Retake quiz
  - Back to chapter
  - Share result

### 6. Flashcards Screen

#### Card Display

- [ ] 3D flip animation
- [ ] Front: Question/Term
- [ ] Back: Answer/Definition
- [ ] Swipe gestures:
  - Swipe right: Know it ✓
  - Swipe left: Don't know ✗
  - Tap: Flip card

#### Progress

- [ ] Cards remaining counter
- [ ] Progress bar
- [ ] Known/Unknown piles

#### Session Complete

- [ ] Summary stats
- [ ] Retry unknown cards
- [ ] Back to chapter

### 7. Mind Map Screen

#### Viewer

- [ ] Zoomable/pannable canvas
- [ ] Node display:
  - Root node (center)
  - Child nodes (branches)
  - Connections (lines)
- [ ] Tap node to expand/collapse
- [ ] Tap node to view details

#### Controls

- [ ] Zoom in/out buttons
- [ ] Reset view button
- [ ] Fullscreen toggle

### 8. Library Screen (Tab 2)

#### My Books

- [ ] Filter: All, In Progress, Completed
- [ ] Sort: Recent, Name, Progress
- [ ] Book cards with progress

#### Collections (Optional)

- [ ] Create custom collections
- [ ] Organize books

### 9. Progress Screen (Tab 3)

#### Stats Overview

- [ ] Total books
- [ ] Completed chapters
- [ ] Quiz average score
- [ ] Study streak

#### Charts

- [ ] Study time (daily/weekly)
- [ ] Quiz scores over time
- [ ] Progress by book

#### Achievements (Optional)

- [ ] Badges for milestones
- [ ] Leaderboard

### 10. Profile Screen (Tab 4)

#### User Info

- [ ] Avatar
- [ ] Name, email
- [ ] Edit profile button

#### Settings

- [ ] Theme (Light/Dark)
- [ ] Language
- [ ] Notifications
- [ ] Sound effects
- [ ] Haptic feedback

#### Account

- [ ] Change password
- [ ] Logout

## Animation Guidelines

### Micro-interactions

- **Button press**: Scale down slightly (0.95) + haptic
- **Card tap**: Gentle bounce
- **Success**: Confetti/sparkle animation
- **Error**: Shake animation
- **Loading**: Smooth spinner with gradient

### Transitions

- **Screen transitions**: Slide from right (iOS style)
- **Modal**: Slide from bottom
- **Tab switch**: Fade + slight scale

### Quiz Animations

- **Question appear**: Fade in + slide up
- **Option select**: Scale + color change
- **Timer warning**: Pulse when < 10s
- **Result reveal**: Count up animation for score

### Flashcard Animations

- **Flip**: 3D rotation (180deg)
- **Swipe**: Card flies off screen
- **Stack shuffle**: Cards rearrange

## Implementation Plan

### Phase 1: Setup & Foundation (Week 1)

#### Day 1-2: Project Setup

- [ ] Initialize Expo project with TypeScript

```bash
npx create-expo-app@latest apps/mobile --template blank-typescript
cd apps/mobile
npx expo install expo-router react-native-safe-area-context react-native-screens
```

- [ ] Setup Expo Router
- [ ] Setup NativeWind

```bash
npm install nativewind
npm install --save-dev tailwindcss
```

- [ ] Configure TypeScript
- [ ] Setup folder structure

#### Day 3-4: Design System

- [ ] Create color constants
- [ ] Create typography constants
- [ ] Create spacing constants
- [ ] Create base UI components:
  - Button
  - Card
  - Input
  - Badge
  - GradientBackground

#### Day 5-7: API Integration

- [ ] Setup Axios instance
- [ ] Create API services (auth, books, quiz, etc.)
- [ ] Setup React Query
- [ ] Create custom hooks (useAuth, useBooks, etc.)
- [ ] Setup Zustand stores

### Phase 2: Authentication & Navigation (Week 1-2)

#### Day 8-10: Auth Flow

- [ ] Login screen UI
- [ ] Register screen UI
- [ ] Forgot password screen
- [ ] Auth logic integration
- [ ] Token storage (AsyncStorage)
- [ ] Protected routes

#### Day 11-12: Tab Navigation

- [ ] Setup tab navigator
- [ ] Create tab icons
- [ ] Tab bar styling (feng shui colors)
- [ ] Tab screens placeholders

### Phase 3: Core Screens (Week 2-3)

#### Day 13-15: Books & Chapters

- [ ] Home/Books screen
  - Book list
  - Search & filter
  - Categories
- [ ] Book detail screen
  - Cover, info, stats
  - Chapters list
- [ ] Chapter detail screen
  - Content display
  - Quick actions

#### Day 16-18: Quiz System

- [ ] Quiz start screen
- [ ] Quiz playing screen
  - Question display
  - Options rendering
  - Timer
  - Navigation
- [ ] Quiz result screen
  - Score display
  - Review answers
  - Animations

#### Day 19-20: Flashcards

- [ ] Flashcard component
- [ ] Flip animation
- [ ] Swipe gestures
- [ ] Session flow
- [ ] Progress tracking

#### Day 21: Mind Map

- [ ] Mind map viewer (basic)
- [ ] Node rendering
- [ ] Pan/zoom controls
- [ ] (Advanced features optional)

### Phase 4: Additional Features (Week 3)

#### Day 22-23: Library & Progress

- [ ] Library screen
  - My books
  - Filters
- [ ] Progress screen
  - Stats
  - Charts (react-native-chart-kit)

#### Day 24-25: Profile & Settings

- [ ] Profile screen
- [ ] Settings screen
- [ ] Theme switching
- [ ] Logout

### Phase 5: Polish & Optimization (Week 4)

#### Day 26-27: Animations & UX

- [ ] Add micro-interactions
- [ ] Smooth transitions
- [ ] Haptic feedback
- [ ] Sound effects (optional)
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states

#### Day 28-29: Testing & Bug Fixes

- [ ] Test on iOS simulator
- [ ] Test on Android emulator
- [ ] Test on real devices
- [ ] Fix bugs
- [ ] Performance optimization
- [ ] Memory leak checks

#### Day 30: Web Build & Documentation

- [ ] Configure for web (mobile viewport)
- [ ] Test web build
- [ ] Update README
- [ ] Create deployment guide

## Development Commands

### Setup

```bash
cd apps/mobile
npm install
```

### Development

```bash
# Start Expo dev server
npx expo start

# Run on iOS
npx expo start --ios

# Run on Android
npx expo start --android

# Run on Web (mobile view)
npx expo start --web
```

### Build

```bash
# Development build
eas build --profile development --platform ios
eas build --profile development --platform android

# Production build
eas build --profile production --platform all

# Web build
npx expo export:web
```

## Web Configuration (Mobile-First)

### app.json

```json
{
  "expo": {
    "name": "Quiz Game",
    "slug": "quiz-game",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#C41E3A"
    },
    "web": {
      "bundler": "metro",
      "favicon": "./assets/favicon.png",
      "viewport": {
        "width": 375,
        "height": 812,
        "initialScale": 1,
        "maximumScale": 1,
        "userScalable": false
      }
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.quizgame"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#C41E3A"
      },
      "package": "com.yourcompany.quizgame"
    }
  }
}
```

## Key Dependencies

```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "expo-router": "~3.4.0",
    "react": "18.2.0",
    "react-native": "0.73.0",

    "nativewind": "^2.0.11",
    "tailwindcss": "^3.3.0",

    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "zustand": "^4.4.0",

    "react-native-reanimated": "~3.6.0",
    "react-native-gesture-handler": "~2.14.0",
    "lottie-react-native": "6.5.1",

    "@react-native-async-storage/async-storage": "1.21.0",
    "expo-haptics": "~12.8.0",
    "expo-linear-gradient": "~12.7.0",

    "react-native-chart-kit": "^6.12.0",
    "react-native-svg": "14.1.0"
  }
}
```

## Design Inspiration

### Reference Screens (Based on uploaded image)

1. **Splash/Home**: Ống tre vàng trên nền đỏ
2. **Quiz Card**: Card với gradient xanh lá, hình minh họa đẹp
3. **Result**: Celebration với màu sắc tươi sáng

### Apply to Quiz App

- **Home**: Sách như "ống tre" kiến thức
- **Quiz**: Card câu hỏi với gradient đẹp mắt
- **Result**: Celebration animation khi pass
- **Progress**: Charts với màu vàng-đỏ may mắn

## Success Metrics

- [ ] Smooth 60fps animations on all screens
- [ ] App size < 50MB
- [ ] Load time < 2s
- [ ] Works on iOS 13+, Android 8+
- [ ] Web responsive (mobile-first)
- [ ] Accessibility score > 85
- [ ] No memory leaks
- [ ] Offline support for downloaded content

## Notes

- **Ưu tiên UX**: Mượt mà, dễ sử dụng, trực quan
- **Màu sắc**: Đỏ-vàng may mắn nhưng không quá chói
- **Animation**: Có ý nghĩa, không làm phiền
- **Performance**: Tối ưu cho low-end devices
- **Offline**: Cache data với React Query
- **Testing**: Test trên nhiều devices khác nhau

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [NativeWind](https://www.nativewind.dev/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)

---

**Next Steps**:

1. Review & approve this task
2. Initialize Expo project
3. Setup design system
4. Start with Phase 1 implementation
