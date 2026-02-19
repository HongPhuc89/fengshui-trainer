# Flutter Mobile App Architecture

## Document Information
- **Project**: Thiên Thư Mobile App
- **Platform**: Flutter (iOS & Android)
- **Version**: 1.0
- **Last Updated**: 2026-02-17

---

## Project Structure

```
lib/
├── main.dart
├── app.dart
├── config/
│   ├── routes.dart
│   ├── theme.dart
│   └── constants.dart
├── core/
│   ├── api/
│   │   ├── api_client.dart
│   │   ├── api_endpoints.dart
│   │   └── interceptors.dart
│   ├── models/
│   │   ├── user.dart
│   │   ├── book.dart
│   │   ├── video.dart
│   │   └── practice.dart
│   ├── services/
│   │   ├── auth_service.dart
│   │   ├── device_service.dart
│   │   ├── storage_service.dart
│   │   └── watermark_service.dart
│   └── utils/
│       ├── validators.dart
│       └── formatters.dart
├── features/
│   ├── auth/
│   │   ├── screens/
│   │   ├── widgets/
│   │   └── providers/
│   ├── books/
│   │   ├── screens/
│   │   ├── widgets/
│   │   └── providers/
│   ├── videos/
│   ├── practice/
│   └── profile/
└── shared/
    ├── widgets/
    └── providers/
```

---

## State Management (Riverpod)

### Providers Structure

```dart
// lib/core/providers/auth_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

final authServiceProvider = Provider((ref) => AuthService());

final userProvider = StateNotifierProvider<UserNotifier, AsyncValue<User?>>((ref) {
  return UserNotifier(ref.read(authServiceProvider));
});

class UserNotifier extends StateNotifier<AsyncValue<User?>> {
  final AuthService _authService;
  
  UserNotifier(this._authService) : super(const AsyncValue.loading()) {
    _loadUser();
  }
  
  Future<void> _loadUser() async {
    state = const AsyncValue.loading();
    try {
      final user = await _authService.getCurrentUser();
      state = AsyncValue.data(user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
  
  Future<void> login(String username, String password) async {
    state = const AsyncValue.loading();
    try {
      final user = await _authService.login(username, password);
      state = AsyncValue.data(user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
  
  Future<void> logout() async {
    await _authService.logout();
    state = const AsyncValue.data(null);
  }
}
```

### Books Provider

```dart
// lib/features/books/providers/books_provider.dart
final booksProvider = FutureProvider.family<List<Book>, String?>((ref, category) async {
  final api = ref.read(apiClientProvider);
  return api.getBooks(category: category);
});

final bookDetailProvider = FutureProvider.family<Book, String>((ref, slug) async {
  final api = ref.read(apiClientProvider);
  return api.getBookDetail(slug);
});

final purchasedBooksProvider = FutureProvider<List<Book>>((ref) async {
  final api = ref.read(apiClientProvider);
  return api.getPurchasedBooks();
});
```

---

## API Client

```dart
// lib/core/api/api_client.dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  late final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  
  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiEndpoints.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
    ));
    
    _dio.interceptors.add(AuthInterceptor(_storage));
    _dio.interceptors.add(LogInterceptor(responseBody: true));
  }
  
  // Books
  Future<List<Book>> getBooks({String? category}) async {
    final response = await _dio.get('/books/', queryParameters: {
      if (category != null) 'category': category,
    });
    return (response.data['results'] as List)
        .map((json) => Book.fromJson(json))
        .toList();
  }
  
  Future<Book> getBookDetail(String slug) async {
    final response = await _dio.get('/books/$slug/');
    return Book.fromJson(response.data);
  }
  
  Future<BookChapter> getChapter(String bookSlug, int order) async {
    final response = await _dio.get('/books/$bookSlug/chapters/$order/');
    return BookChapter.fromJson(response.data);
  }
  
  // Videos
  Future<List<Video>> getVideos({String? category}) async {
    final response = await _dio.get('/videos/', queryParameters: {
      if (category != null) 'category': category,
    });
    return (response.data['results'] as List)
        .map((json) => Video.fromJson(json))
        .toList();
  }
  
  Future<void> updateVideoProgress(String slug, int progressSeconds) async {
    await _dio.post('/videos/$slug/progress/', data: {
      'progress_seconds': progressSeconds,
    });
  }
}
```

### Auth Interceptor

```dart
// lib/core/api/interceptors.dart
class AuthInterceptor extends Interceptor {
  final FlutterSecureStorage _storage;
  
  AuthInterceptor(this._storage);
  
  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.read(key: 'access_token');
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
  
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Try to refresh token
      final refreshed = await _refreshToken();
      if (refreshed) {
        // Retry original request
        final options = err.requestOptions;
        final token = await _storage.read(key: 'access_token');
        options.headers['Authorization'] = 'Bearer $token';
        
        try {
          final response = await Dio().fetch(options);
          handler.resolve(response);
          return;
        } catch (e) {
          // Refresh failed, logout
          await _storage.deleteAll();
        }
      }
    }
    handler.next(err);
  }
  
  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await _storage.read(key: 'refresh_token');
      if (refreshToken == null) return false;
      
      final response = await Dio().post(
        '${ApiEndpoints.baseUrl}/auth/refresh/',
        data: {'refresh': refreshToken},
      );
      
      await _storage.write(
        key: 'access_token',
        value: response.data['access'],
      );
      return true;
    } catch (e) {
      return false;
    }
  }
}
```

---

## Screens

### Book Reader Screen

```dart
// lib/features/books/screens/book_reader_screen.dart
class BookReaderScreen extends ConsumerStatefulWidget {
  final String bookSlug;
  final int chapterOrder;
  
  const BookReaderScreen({
    required this.bookSlug,
    required this.chapterOrder,
  });
  
  @override
  ConsumerState<BookReaderScreen> createState() => _BookReaderScreenState();
}

class _BookReaderScreenState extends ConsumerState<BookReaderScreen> {
  @override
  Widget build(BuildContext context) {
    final chapterAsync = ref.watch(
      chapterProvider(widget.bookSlug, widget.chapterOrder)
    );
    
    return Scaffold(
      appBar: AppBar(title: Text('Đọc sách')),
      body: chapterAsync.when(
        data: (chapter) => Stack(
          children: [
            SingleChildScrollView(
              padding: EdgeInsets.all(16),
              child: HtmlWidget(chapter.content),
            ),
            // Watermark overlay
            if (chapter.watermark != null)
              WatermarkOverlay(
                config: WatermarkConfig.fromJson(chapter.watermark!),
              ),
          ],
        ),
        loading: () => Center(child: CircularProgressIndicator()),
        error: (error, stack) => ErrorWidget(error: error),
      ),
    );
  }
}
```

### Video Player Screen

```dart
// lib/features/videos/screens/video_player_screen.dart
class VideoPlayerScreen extends ConsumerStatefulWidget {
  final String videoSlug;
  
  const VideoPlayerScreen({required this.videoSlug});
  
  @override
  ConsumerState<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends ConsumerState<VideoPlayerScreen> {
  late VideoPlayerController _controller;
  Timer? _progressTimer;
  
  @override
  void initState() {
    super.initState();
    _initializePlayer();
  }
  
  Future<void> _initializePlayer() async {
    final video = await ref.read(videoDetailProvider(widget.videoSlug).future);
    
    _controller = VideoPlayerController.network(video.videoUrl)
      ..initialize().then((_) {
        setState(() {});
        _startProgressTracking();
      });
  }
  
  void _startProgressTracking() {
    _progressTimer = Timer.periodic(Duration(seconds: 10), (timer) {
      final position = _controller.value.position.inSeconds;
      ref.read(apiClientProvider).updateVideoProgress(
        widget.videoSlug,
        position,
      );
    });
  }
  
  @override
  Widget build(BuildContext context) {
    final videoAsync = ref.watch(videoDetailProvider(widget.videoSlug));
    
    return Scaffold(
      body: videoAsync.when(
        data: (video) => Stack(
          children: [
            Center(
              child: _controller.value.isInitialized
                  ? AspectRatio(
                      aspectRatio: _controller.value.aspectRatio,
                      child: VideoPlayer(_controller),
                    )
                  : CircularProgressIndicator(),
            ),
            // Video watermark
            if (video.watermark != null)
              VideoWatermark(
                config: WatermarkConfig.fromJson(video.watermark!),
              ),
            // Controls
            VideoControls(controller: _controller),
          ],
        ),
        loading: () => Center(child: CircularProgressIndicator()),
        error: (error, stack) => ErrorWidget(error: error),
      ),
    );
  }
  
  @override
  void dispose() {
    _progressTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }
}
```

---

## Models

```dart
// lib/core/models/book.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'book.freezed.dart';
part 'book.g.dart';

@freezed
class Book with _$Book {
  const factory Book({
    required int id,
    required String title,
    required String slug,
    required BookCategory category,
    required String author,
    required String coverImage,
    required String description,
    required bool isFree,
    required bool isNewRelease,
    required String price,
    required bool hasPurchased,
    List<BookChapter>? chapters,
  }) = _Book;
  
  factory Book.fromJson(Map<String, dynamic> json) => _$BookFromJson(json);
}

@freezed
class BookChapter with _$BookChapter {
  const factory BookChapter({
    required int id,
    required String title,
    required int order,
    required String content,
    required bool isDemo,
    Map<String, dynamic>? watermark,
  }) = _BookChapter;
  
  factory BookChapter.fromJson(Map<String, dynamic> json) =>
      _$BookChapterFromJson(json);
}
```

---

## Theme Configuration

```dart
// lib/config/theme.dart
class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: Colors.deepPurple,
        brightness: Brightness.light,
      ),
      appBarTheme: AppBarTheme(
        centerTitle: true,
        elevation: 0,
      ),
    );
  }
  
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: Colors.deepPurple,
        brightness: Brightness.dark,
      ),
      appBarTheme: AppBarTheme(
        centerTitle: true,
        elevation: 0,
      ),
    );
  }
}
```

---

## Dependencies

```yaml
# pubspec.yaml
name: fengshui_trainer
description: Feng Shui Learning Platform

dependencies:
  flutter:
    sdk: flutter
  
  # State Management
  flutter_riverpod: ^2.4.0
  riverpod_annotation: ^2.3.0
  
  # API & Networking
  dio: ^5.4.0
  retrofit: ^4.0.0
  
  # Storage
  flutter_secure_storage: ^9.0.0
  shared_preferences: ^2.2.0
  
  # Models
  freezed_annotation: ^2.4.0
  json_annotation: ^4.8.0
  
  # UI
  cached_network_image: ^3.3.0
  flutter_html: ^3.0.0
  
  # Video
  video_player: ^2.8.0
  chewie: ^1.7.0
  
  # Security
  flutter_windowmanager: ^0.2.0
  device_info_plus: ^9.1.0
  
  # Utils
  intl: ^0.18.0
  url_launcher: ^6.2.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  
  # Code Generation
  build_runner: ^2.4.0
  freezed: ^2.4.0
  json_serializable: ^6.7.0
  riverpod_generator: ^2.3.0
  
  # Linting
  flutter_lints: ^3.0.0
```

---

## Build Configuration

### Android

```gradle
// android/app/build.gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        applicationId "com.fengshui.trainer"
        minSdkVersion 24
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

### iOS

```ruby
# ios/Podfile
platform :ios, '13.0'

post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
    end
  end
end
```

---

## Testing Strategy

```dart
// test/features/books/book_service_test.dart
void main() {
  group('BookService', () {
    late MockApiClient mockApi;
    late BookService bookService;
    
    setUp(() {
      mockApi = MockApiClient();
      bookService = BookService(mockApi);
    });
    
    test('getBooks returns list of books', () async {
      when(mockApi.getBooks()).thenAnswer(
        (_) async => [Book(id: 1, title: 'Test Book')],
      );
      
      final books = await bookService.getBooks();
      
      expect(books, isA<List<Book>>());
      expect(books.length, 1);
      verify(mockApi.getBooks()).called(1);
    });
  });
}
```
