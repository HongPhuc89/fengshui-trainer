# Quiz Game Mobile App 🎋

A beautiful React Native mobile application for the Quiz Game learning platform, featuring a Feng Shui-inspired design with Vietnamese lucky colors (red-gold).

## 📱 Features

### Current (Phase 1 - Completed)

- ✅ **Expo + TypeScript** setup with Expo Router
- ✅ **Feng Shui Design System** with red-gold color palette
- ✅ **Base UI Components** (Button, Card, Input, Badge, GradientBackground)
- ✅ **Authentication Screens** (Login, Register)
- ✅ **Tab Navigation** (Home, Library, Progress, Profile)
- ✅ **API Client** with Axios and React Query
- ✅ **Smooth Animations** with Reanimated
- ✅ **Haptic Feedback** for better UX

### Planned (Next Phases)

- 🔲 Books browsing and search
- 🔲 Chapter reading
- 🔲 Quiz system with timer
- 🔲 Flashcards with flip animations
- 🔲 Mind map viewer
- 🔲 Progress tracking and stats
- 🔲 Offline support

## 🎨 Design System

### Color Palette (Feng Shui)

```typescript
Primary (Lucky Red):
- Red: #C41E3A
- Red Dark: #8B0000
- Red Light: #E63946

Secondary (Gold):
- Gold: #FFD700
- Gold Dark: #DAA520
- Gold Light: #FFF8DC

Accent:
- Jade: #00A86B (Growth, Learning)
- Brown: #8B4513 (Stability)
- Cream: #FFF8DC (Softness)

Gradients:
- Lucky: Red → Dark Red
- Gold: Gold → Orange
- Red-Gold: Red → Gold (Main)
- Jade: Jade → Dark Green
```

### Typography

- **Heading**: UTM-Avo (Vietnamese font)
- **Body**: SVN-Gilroy
- **Decorative**: UTM-Cookies
- **Fallback**: System fonts (SF Pro, Roboto)

## 🛠️ Tech Stack

### Core

- **React Native**: 0.73.x
- **Expo**: ~54.0.0
- **TypeScript**: Latest
- **Expo Router**: File-based routing

### Styling & Animation

- **NativeWind**: TailwindCSS for React Native
- **React Native Reanimated**: 60fps animations
- **Expo Linear Gradient**: Beautiful gradients
- **React Native Gesture Handler**: Touch interactions

### State & Data

- **TanStack Query (React Query)**: API data fetching & caching
- **Zustand**: Lightweight state management
- **AsyncStorage**: Local persistence
- **Axios**: HTTP client

### Additional

- **Expo Haptics**: Tactile feedback
- **React Native SVG**: Vector graphics
- **React Native Safe Area Context**: Safe area handling

## 📁 Project Structure

```
apps/mobile/
├── app/                          # Expo Router screens
│   ├── (auth)/                   # Auth group
│   │   ├── login.tsx            # ✅ Login screen
│   │   └── register.tsx         # ✅ Register screen
│   ├── (tabs)/                   # Main tabs
│   │   ├── index.tsx            # ✅ Home screen
│   │   ├── library.tsx          # ✅ Library screen
│   │   ├── progress.tsx         # ✅ Progress screen
│   │   └── profile.tsx          # ✅ Profile screen
│   ├── _layout.tsx              # ✅ Root layout
│   └── index.tsx                # ✅ Welcome screen
│
├── src/
│   ├── components/               # Reusable components
│   │   ├── ui/                   # ✅ Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── GradientBackground.tsx
│   │   └── common/               # ✅ Common components
│   │       └── LoadingSpinner.tsx
│   │
│   ├── services/                 # API services
│   │   └── api.ts               # ✅ Axios client
│   │
│   ├── constants/                # ✅ Design system
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── config.ts
│   │
│   ├── hooks/                    # Custom hooks (planned)
│   ├── stores/                   # Zustand stores (planned)
│   ├── utils/                    # Utilities (planned)
│   └── types/                    # TypeScript types (planned)
│
├── assets/                       # Static assets
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── app.json                      # Expo config
├── babel.config.js              # ✅ Babel config
├── tailwind.config.js           # ✅ Tailwind config
├── tsconfig.json                # ✅ TypeScript config
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Expo CLI (optional, will use npx)

### Installation

```bash
# Navigate to mobile directory
cd apps/mobile

# Install dependencies
npm install
```

### Development

```bash
# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Run on Web (mobile viewport)
npx expo start --web
```

### Build

See [BUILD_GUIDE.md](./BUILD_GUIDE.md) for detailed build instructions.

#### Quick Start - Build APK for Testing

```bash
# Install EAS CLI (one-time)
npm install -g eas-cli

# Login to Expo
eas login

# Build APK for testing
npm run build:android:preview
```

#### All Build Commands

```bash
# Android APK (for testing)
npm run build:android:preview

# Android APK (local build - faster)
npm run build:android:apk

# Android AAB (for Google Play Store)
npm run build:android

# iOS IPA (for App Store)
npm run build:ios

# Prebuild native projects
npm run prebuild
npm run prebuild:clean
```

## 📱 Screens

### ✅ Implemented

1. **Welcome Screen** - Gradient splash with "Bắt đầu" button
2. **Login Screen** - Email/password login with gradient background
3. **Register Screen** - Sign up form with validation
4. **Home Screen** - Dashboard with featured books (placeholder)
5. **Library Screen** - User's book collection (placeholder)
6. **Progress Screen** - Learning stats and charts (placeholder)
7. **Profile Screen** - User profile and settings (placeholder)

### 🔲 Planned

- Book Detail Screen
- Chapter Reading Screen
- Quiz Start/Play/Result Screens
- Flashcard Session Screen
- Mind Map Viewer Screen

## 🎯 API Integration

### Backend Connection

The app connects to the NestJS backend API:

- **Development**: `http://localhost:3000`
- **Production**: `https://api.quizgame.com` (to be configured)

### API Client Features

- ✅ Auto token injection
- ✅ Token refresh on 401
- ✅ Request/response interceptors
- ✅ Typed HTTP methods
- ✅ Error handling

### Example Usage

```typescript
import { api } from '@/services/api';

// GET request
const books = await api.get('/books');

// POST request
const result = await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123',
});
```

## 🎨 UI Components

### Button

```tsx
<Button
  variant="primary" // primary | secondary | outline | ghost
  size="lg" // sm | md | lg
  gradient // Enable gradient
  fullWidth // Full width
  loading // Show loading spinner
  leftIcon={<Icon />} // Left icon
  onPress={handlePress}
>
  Click me
</Button>
```

### Card

```tsx
<Card
  variant="elevated" // default | elevated | outlined | gradient
  padding="lg" // none | sm | md | lg
  shadow="md" // none | sm | md | lg
>
  Content here
</Card>
```

### Input

```tsx
<Input
  label="Email"
  placeholder="your@email.com"
  error="Invalid email"
  leftIcon={<Icon />}
  value={value}
  onChangeText={setValue}
/>
```

### Badge

```tsx
<Badge
  variant="success" // success | warning | error | info | primary | secondary
  size="md" // sm | md | lg
>
  New
</Badge>
```

### GradientBackground

```tsx
<GradientBackground variant="redGold">
  <View>Content with gradient background</View>
</GradientBackground>
```

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```env
API_BASE_URL=http://localhost:3000
```

### App Config

Edit `src/constants/config.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: __DEV__ ? 'http://localhost:3000' : 'https://api.quizgame.com',
  TIMEOUT: 10000,
};
```

## 📝 Scripts

```json
{
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web"
}
```

## 🎯 Development Roadmap

### Phase 1: Setup & Foundation ✅ (Completed)

- [x] Initialize Expo project
- [x] Setup Expo Router
- [x] Configure NativeWind
- [x] Create design system
- [x] Build base UI components
- [x] Setup API client
- [x] Create auth screens
- [x] Create tab navigation

### Phase 2: Core Features (In Progress)

- [ ] Books service & screens
- [ ] Chapter reading
- [ ] Quiz system
- [ ] Flashcards
- [ ] Mind map viewer

### Phase 3: Polish & Optimization

- [ ] Animations
- [ ] Haptic feedback
- [ ] Loading states
- [ ] Error handling
- [ ] Offline support

### Phase 4: Testing & Launch

- [ ] Unit tests
- [ ] E2E tests
- [ ] Performance optimization
- [ ] App store submission

## 🐛 Known Issues

- None yet (just started!)

## 📄 License

UNLICENSED - Private project

## 👥 Contributors

- Development Team

## 📞 Support

For support, email support@quizgame.com

---

**Built with ❤️ using React Native + Expo**

**Design inspired by Vietnamese Feng Shui aesthetics** 🎋
