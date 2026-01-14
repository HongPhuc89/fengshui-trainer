# Fengshui Trainer - Flutter Mobile App

A Flutter mobile application for learning Feng Shui through interactive books, quizzes, flashcards, and mindmaps.

## Features

- 📚 **Book Library**: Browse and read Feng Shui books
- 📖 **PDF Reader**: Read chapters with progress tracking
- 🧠 **Quizzes**: Test your knowledge with interactive quizzes
- 🎴 **Flashcards**: Review concepts with flashcard sessions
- 🗺️ **Mindmaps**: Visualize chapter content as mindmaps
- 🏆 **Leaderboard**: Compete with other learners
- 👤 **Profile**: Track your learning progress

## Getting Started

### Prerequisites

- Flutter SDK (3.5.0 or higher)
- Dart SDK
- Android Studio / Xcode for mobile development

### Installation

1. **Clone the repository**

   ```bash
   cd apps/mobile_flutter
   ```

2. **Install dependencies**

   ```bash
   flutter pub get
   ```

3. **Configure environment variables**

   Create a `.env` file in the project root:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and add your configuration:

   ```env
   API_BASE_URL=https://book-api.hongphuc.top/api/
   AMPLITUDE_API_KEY=your_amplitude_api_key_here
   ENV=development
   ```

4. **Run the app**
   ```bash
   flutter run
   ```

### Building for Production

For production builds, update your `.env` file with production values:

```env
API_BASE_URL=https://book-api.hongphuc.top/api/
AMPLITUDE_API_KEY=your_production_amplitude_api_key
ENV=production
```

Then build:

```bash
# Android APK
flutter build apk

# Android App Bundle
flutter build appbundle

# iOS
flutter build ios
```

## Analytics

The app uses both Amplitude and Firebase Analytics for tracking user behavior and app performance.

### Setup Amplitude

1. Get your Amplitude API key from [amplitude.com](https://amplitude.com)
2. Add it to your `.env` file:
   ```env
   AMPLITUDE_API_KEY=your_api_key_here
   ```

For detailed analytics documentation, see [ANALYTICS.md](documents/ANALYTICS.md).

## Project Structure

```
lib/
├── core/               # Core functionality
│   ├── config/        # App configuration
│   ├── network/       # API client
│   ├── services/      # Shared services (analytics, PDF cache)
│   ├── storage/       # Local storage
│   └── widgets/       # Reusable widgets
├── features/          # Feature modules
│   ├── auth/          # Authentication
│   ├── books/         # Book library
│   ├── chapters/      # Chapter reading
│   ├── flashcards/    # Flashcard system
│   ├── home/          # Home, profile, leaderboard
│   ├── mindmap/       # Mindmap viewer
│   └── quiz/          # Quiz system
└── main.dart          # App entry point
```

## Development

### Code Analysis

```bash
flutter analyze
```

### Running Tests

```bash
flutter test
```

### Code Generation

The app uses code generation for JSON serialization:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

## Resources

- [Flutter Documentation](https://docs.flutter.dev/)
- [Dart Documentation](https://dart.dev/guides)
- [Analytics Documentation](documents/ANALYTICS.md)
- [Flashcards Integration](documents/FLASHCARDS_INTEGRATION.md)
