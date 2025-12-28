# Mobile App - Feng Shui Design

**Status**: 🔲 Planned
**Priority**: High
**Created**: 2025-12-08
**Last Updated**: 2025-12-08

## Overview

Build a React Native mobile application for the Quiz Game system with a beautiful Feng Shui-inspired design. The app will feature a red-gold color scheme inspired by Vietnamese feng shui aesthetics, providing an engaging and visually stunning learning experience.

## Context

### Existing System

- **Backend**: NestJS API (fully functional)
- **Database**: PostgreSQL with TypeORM
- **Features**: Books, Chapters, Quiz, Flashcards, Mind Maps
- **Admin**: React Admin dashboard (completed)

### Goal

Create a mobile app that:

- Connects to existing backend API
- Provides beautiful, intuitive UI for learners
- Works on iOS, Android, and Web (mobile-first)
- Uses Feng Shui design principles (lucky colors, smooth animations)

## Design Inspiration

### Reference Image

Based on uploaded design showing:

- Red background (#C41E3A) - lucky color
- Gold/yellow accents (#FFD700) - prosperity
- 3D bamboo stick graphics
- Smooth animations
- Card-based UI with gradients
- Celebration effects

### Applied to Quiz App

- **Books**: Represented as "containers of knowledge" (like bamboo containers)
- **Quiz Cards**: Beautiful gradient cards with illustrations
- **Results**: Celebration animations when passing
- **Progress**: Charts with feng shui colors

## Tech Stack

### Core Framework

- **React Native**: 0.73.x
- **Expo**: ~50.0.0 (for easier development)
- **TypeScript**: Latest
- **Expo Router**: File-based routing

### Styling & UI

- **NativeWind**: TailwindCSS for React Native
- **React Native Paper** or **NativeBase**: Component library
- **Expo Linear Gradient**: For beautiful gradients

### Animations

- **React Native Reanimated**: Smooth 60fps animations
- **React Native Gesture Handler**: Touch interactions
- **Lottie**: Complex animations (celebrations, loading)

### State & Data

- **TanStack Query (React Query)**: API data fetching & caching
- **Zustand**: Lightweight state management
- **AsyncStorage**: Local persistence
- **Axios**: HTTP client

### Additional Libraries

- **React Native SVG**: Vector graphics
- **React Native Chart Kit**: Progress charts
- **Expo Haptics**: Tactile feedback
- **Expo Font**: Custom fonts

## Architecture

### Folder Structure

```
apps/mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Auth group
│   ├── (tabs)/            # Main tabs
│   ├── book/              # Book screens
│   ├── quiz/              # Quiz screens
│   └── _layout.tsx
├── src/
│   ├── components/        # Reusable components
│   ├── services/          # API services
│   ├── hooks/             # Custom hooks
│   ├── stores/            # Zustand stores
│   ├── constants/         # Design tokens
│   ├── utils/             # Utilities
│   └── types/             # TypeScript types
└── assets/                # Images, fonts, animations
```

### API Integration

All API calls go through services that use React Query:

```typescript
// Example: books.service.ts
export const booksApi = {
  getAll: () => api.get('/books'),
  getById: (id: number) => api.get(`/books/${id}`),
  // ...
};

// Usage in component with React Query
const { data: books } = useQuery({
  queryKey: ['books'],
  queryFn: booksApi.getAll,
});
```

## Design System

### Color Palette

#### Primary Colors

- **Red (Lucky)**: `#C41E3A` - Main brand color
- **Red Dark**: `#8B0000` - Darker shade
- **Red Light**: `#E63946` - Lighter shade

#### Secondary Colors

- **Gold**: `#FFD700` - Prosperity, success
- **Gold Dark**: `#DAA520` - Darker gold
- **Gold Light**: `#FFF8DC` - Cream/light gold

#### Accent Colors

- **Jade Green**: `#00A86B` - Growth, learning
- **Brown**: `#8B4513` - Wood, stability
- **Cream**: `#FFF8DC` - Softness

#### Gradients

- **Lucky**: Red to Dark Red
- **Gold**: Gold to Orange
- **Red-Gold**: Red to Gold (main gradient)
- **Jade**: Jade to Dark Green

#### Semantic Colors

- **Success**: `#10B981`
- **Warning**: `#F59E0B`
- **Error**: `#EF4444`
- **Info**: `#3B82F6`

### Typography

#### Font Families

- **Heading**: UTM-Avo (Vietnamese font)
- **Body**: SVN-Gilroy
- **Decorative**: UTM-Cookies
- **Fallback**: System fonts (SF Pro, Roboto)

#### Font Sizes

- xs: 12px
- sm: 14px
- base: 16px
- lg: 18px
- xl: 20px
- 2xl: 24px
- 3xl: 30px
- 4xl: 36px
- 5xl: 48px

#### Font Weights

- Light: 300
- Normal: 400
- Medium: 500
- Semibold: 600
- Bold: 700
- Extrabold: 800

### Spacing

- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

### Border Radius

- sm: 4px
- md: 8px
- lg: 12px
- xl: 16px
- 2xl: 24px
- full: 9999px

## Core Features

### 1. Authentication

- **Login**: Email/password with gradient background
- **Register**: Sign up flow
- **Forgot Password**: Password recovery
- **Token Management**: JWT storage in AsyncStorage

### 2. Books Library

- **Browse Books**: Grid/list view with covers
- **Search**: Real-time search
- **Filter**: By category, difficulty, status
- **Book Detail**: Cover, description, chapters, stats

### 3. Chapter Reading

- **Content Display**: Formatted text
- **Progress Tracking**: Auto-save reading position
- **Quick Actions**: Quiz, Flashcards, Mind Map

### 4. Quiz System

- **Quiz Start**: Info card with settings
- **Quiz Play**:
  - Timer countdown
  - Question display
  - Multiple choice/True-False options
  - Progress indicator
  - Navigation (prev/next)
- **Quiz Result**:
  - Score with circular progress
  - Pass/fail status
  - Celebration animation
  - Review answers
  - Retake option

### 5. Flashcards

- **Card Display**: Front/back with flip animation
- **Swipe Gestures**:
  - Right: Know it ✓
  - Left: Don't know ✗
- **Progress**: Cards remaining counter
- **Session Summary**: Stats and retry option

### 6. Mind Map

- **Viewer**: Zoomable/pannable canvas
- **Nodes**: Hierarchical display
- **Interactions**: Tap to expand/collapse

### 7. Progress & Stats

- **Overview**: Total books, chapters, quiz scores
- **Charts**: Study time, quiz performance
- **Achievements**: Badges for milestones

### 8. Profile & Settings

- **Profile**: Avatar, name, email
- **Settings**: Theme, language, notifications
- **Account**: Change password, logout

## Screen Specifications

### Home Screen (Books)

```
┌─────────────────────────┐
│ 🎋 Xin chào, [Name]  🔔 │ ← Gradient header
├─────────────────────────┤
│ 🔍 Tìm kiếm sách...     │ ← Search bar
├─────────────────────────┤
│ 📚 Sách nổi bật         │
│ ┌───┐ ┌───┐ ┌───┐      │ ← Horizontal scroll
│ │   │ │   │ │   │      │
│ └───┘ └───┘ └───┘      │
├─────────────────────────┤
│ 📂 Danh mục             │
│ ┌─────┐ ┌─────┐        │ ← Grid
│ │ 💼  │ │ 🎓  │        │
│ └─────┘ └─────┘        │
├─────────────────────────┤
│ 📖 Tất cả sách          │
│ ┌─────────────────────┐ │
│ │ [Book Card]         │ │ ← List
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Quiz Playing Screen

```
┌─────────────────────────┐
│ ⏱️ 15:30    1/10    ✕   │ ← Timer, progress, exit
├─────────────────────────┤
│                         │
│  Câu hỏi 1: [Text]     │ ← Question card
│  ⭐⭐⭐ (Medium)         │
│                         │
├─────────────────────────┤
│ ○ A. Option 1          │ ← Options
│ ○ B. Option 2          │
│ ○ C. Option 3          │
│ ○ D. Option 4          │
├─────────────────────────┤
│  [← Trước]  [Tiếp →]   │ ← Navigation
└─────────────────────────┘
```

### Quiz Result Screen

```
┌─────────────────────────┐
│    🎉 Chúc mừng!        │ ← Celebration
├─────────────────────────┤
│        ┌─────┐          │
│        │ 85% │          │ ← Circular progress
│        └─────┘          │
│                         │
│   ✓ Đạt yêu cầu         │
│   8/10 câu đúng         │
│   Thời gian: 12:30      │
├─────────────────────────┤
│ [Xem đáp án]            │ ← Actions
│ [Làm lại]               │
│ [Về chương]             │
└─────────────────────────┘
```

## Animation Guidelines

### Micro-interactions

- **Button Press**: Scale to 0.95 + haptic feedback
- **Card Tap**: Gentle bounce (scale 1.0 → 1.05 → 1.0)
- **Success**: Confetti/sparkle particles
- **Error**: Shake animation (horizontal)
- **Loading**: Smooth spinner with gradient

### Screen Transitions

- **Push**: Slide from right (iOS style)
- **Modal**: Slide from bottom
- **Tab Switch**: Fade + slight scale

### Quiz Animations

- **Question Appear**: Fade in + slide up
- **Option Select**: Scale + color change + haptic
- **Timer Warning**: Pulse when < 10 seconds
- **Result Reveal**: Count up animation for score

### Flashcard Animations

- **Flip**: 3D rotation (180deg on Y-axis)
- **Swipe**: Card flies off screen with rotation
- **Stack Shuffle**: Cards rearrange smoothly

## Implementation Plan

### Phase 1: Setup & Foundation (Week 1)

- [ ] Initialize Expo project
- [ ] Setup Expo Router
- [ ] Configure NativeWind
- [ ] Setup TypeScript
- [ ] Create folder structure
- [ ] Setup design system (colors, typography, spacing)
- [ ] Create base UI components (Button, Card, Input)
- [ ] Setup API client (Axios)
- [ ] Configure React Query
- [ ] Setup Zustand stores

### Phase 2: Authentication & Navigation (Week 1-2)

- [ ] Login screen UI
- [ ] Register screen UI
- [ ] Auth logic with backend
- [ ] Token storage
- [ ] Protected routes
- [ ] Tab navigation setup
- [ ] Tab bar styling

### Phase 3: Core Screens (Week 2-3)

- [ ] Home/Books screen
  - Book list
  - Search & filter
  - Categories
- [ ] Book detail screen
  - Info display
  - Chapters list
- [ ] Chapter detail screen
  - Content display
  - Quick actions
- [ ] Quiz flow
  - Start screen
  - Playing screen
  - Result screen
- [ ] Flashcards
  - Card component
  - Flip animation
  - Swipe gestures
- [ ] Mind Map viewer (basic)

### Phase 4: Additional Features (Week 3)

- [ ] Library screen
- [ ] Progress/Stats screen
- [ ] Profile screen
- [ ] Settings screen

### Phase 5: Polish & Testing (Week 4)

- [ ] Add all animations
- [ ] Haptic feedback
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states
- [ ] Test on iOS
- [ ] Test on Android
- [ ] Test on Web
- [ ] Performance optimization
- [ ] Bug fixes

## API Endpoints (Backend)

### Authentication

- `POST /auth/login` - Login
- `POST /auth/register` - Register
- `POST /auth/refresh` - Refresh token

### Books

- `GET /books` - Get all books
- `GET /books/:id` - Get book by ID
- `GET /books/:id/chapters` - Get chapters

### Chapters

- `GET /chapters/:id` - Get chapter
- `GET /chapters/:id/content` - Get content

### Quiz

- `POST /quiz/attempts` - Start quiz
- `POST /quiz/attempts/:id/submit` - Submit quiz
- `GET /quiz/attempts/:id/result` - Get result

### Flashcards

- `GET /flashcards/chapter/:id` - Get flashcards

### Mind Maps

- `GET /mindmaps/chapter/:id` - Get mind map

### User Progress

- `GET /users/me/progress` - Get progress
- `GET /users/me/stats` - Get stats

## Development Commands

### Setup

```bash
cd apps/mobile
npm install
```

### Development

```bash
# Start dev server
npx expo start

# iOS
npx expo start --ios

# Android
npx expo start --android

# Web
npx expo start --web
```

### Build

```bash
# Development build
eas build --profile development --platform ios
eas build --profile development --platform android

# Production
eas build --profile production --platform all
```

## Configuration Files

### app.json

```json
{
  "expo": {
    "name": "Quiz Game",
    "slug": "quiz-game",
    "version": "1.0.0",
    "orientation": "portrait",
    "splash": {
      "backgroundColor": "#C41E3A"
    },
    "web": {
      "bundler": "metro",
      "viewport": {
        "width": 375,
        "height": 812,
        "initialScale": 1,
        "maximumScale": 1,
        "userScalable": false
      }
    }
  }
}
```

### tailwind.config.js

```js
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          red: '#C41E3A',
          'red-dark': '#8B0000',
          'red-light': '#E63946',
        },
        secondary: {
          gold: '#FFD700',
          'gold-dark': '#DAA520',
          'gold-light': '#FFF8DC',
        },
        accent: {
          jade: '#00A86B',
          brown: '#8B4513',
          cream: '#FFF8DC',
        },
      },
    },
  },
};
```

## Success Metrics

### Performance

- [ ] 60fps animations on all screens
- [ ] App load time < 2 seconds
- [ ] API response time < 500ms
- [ ] Smooth scrolling (no jank)

### Quality

- [ ] No crashes
- [ ] No memory leaks
- [ ] Proper error handling
- [ ] Offline support (cached data)

### Compatibility

- [ ] iOS 13+
- [ ] Android 8+
- [ ] Web (mobile viewport)

### User Experience

- [ ] Intuitive navigation
- [ ] Beautiful UI
- [ ] Smooth animations
- [ ] Helpful feedback (loading, errors)

## Acceptance Criteria

- [ ] Expo project initialized with proper structure
- [ ] Design system fully implemented
- [ ] All base UI components created
- [ ] Authentication flow working
- [ ] All main screens implemented:
  - [ ] Books/Home
  - [ ] Book Detail
  - [ ] Chapter Detail
  - [ ] Quiz (start, play, result)
  - [ ] Flashcards
  - [ ] Mind Map
  - [ ] Library
  - [ ] Progress
  - [ ] Profile
- [ ] API integration complete
- [ ] Animations smooth (60fps)
- [ ] Haptic feedback implemented
- [ ] Web build works (mobile-first)
- [ ] Tested on iOS simulator
- [ ] Tested on Android emulator
- [ ] No critical bugs

## Dependencies

### Required

- ✅ Backend API (completed)
- ✅ Database schema (completed)

### Optional

- 🔲 Quiz Configuration System (can be added later)
- 🔲 AI Question Generation (future enhancement)

## Related Files

### Task Documentation

- `.agent/tasks/mobile-app-fengshui-design.md` - Detailed implementation guide

### Code Files (To be created)

- `apps/mobile/app/` - Expo Router screens
- `apps/mobile/src/` - Source code
- `apps/mobile/assets/` - Assets

## Notes

- Focus on UX: smooth, intuitive, beautiful
- Feng Shui colors: red-gold but not overwhelming
- Animations: meaningful, not distracting
- Performance: optimize for low-end devices
- Offline: cache data with React Query
- Testing: test on multiple devices
- Web support: mobile-first viewport for development

## Resources

- [Expo Docs](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [NativeWind](https://www.nativewind.dev/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)

---

**Next Steps**:

1. Review and approve this context
2. Initialize Expo project
3. Setup design system
4. Start Phase 1 implementation
