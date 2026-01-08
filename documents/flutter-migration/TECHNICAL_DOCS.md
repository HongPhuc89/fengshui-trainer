# Flutter Migration - Technical Documentation

## Architecture Overview

### Clean Architecture Pattern

```
Presentation Layer (UI)
    ↓
Domain Layer (Business Logic)
    ↓
Data Layer (API, Storage)
```

### Folder Structure

```
lib/
├── core/                    # Shared utilities
│   ├── config/             # App configuration
│   ├── network/            # API client
│   ├── storage/            # Data persistence
│   └── services/           # Shared services
└── features/               # Feature modules
    ├── auth/
    ├── books/
    └── chapters/
```

Each feature follows:

```
feature/
├── data/
│   ├── models/            # Data models
│   └── repositories/      # Data sources
└── presentation/
    ├── providers/         # State management
    └── pages/            # UI screens
```

---

## State Management (Riverpod)

### Provider Types Used

1. **Provider** - Immutable dependencies

```dart
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(ref.watch(secureStorageProvider));
});
```

2. **StateNotifierProvider** - Mutable state

```dart
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});
```

3. **Family Providers** - Parameterized state

```dart
final chaptersProvider = StateNotifierProvider.family<
  ChaptersNotifier, ChaptersState, int
>((ref, bookId) {
  return ChaptersNotifier(ref.watch(booksRepositoryProvider), bookId);
});
```

### State Pattern

```dart
class FeatureState {
  final Data? data;
  final bool isLoading;
  final String? error;

  FeatureState copyWith({...}) { ... }
}

class FeatureNotifier extends StateNotifier<FeatureState> {
  Future<void> loadData() async {
    state = state.copyWith(isLoading: true);
    try {
      final data = await repository.getData();
      state = state.copyWith(data: data, isLoading: false);
    } catch (e) {
      state = state.copyWith(error: e.toString(), isLoading: false);
    }
  }
}
```

---

## API Integration (Dio)

### Client Setup

```dart
class ApiClient {
  final Dio _dio;
  final SecureStorage _storage;

  ApiClient(this._storage) : _dio = Dio(BaseOptions(
    baseUrl: Environment.apiBaseUrl,
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
  )) {
    _dio.interceptors.add(_authInterceptor());
    _dio.interceptors.add(_logInterceptor());
  }
}
```

### Auth Interceptor

```dart
Interceptor _authInterceptor() {
  return InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await _storage.getToken();
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      handler.next(options);
    },
    onError: (error, handler) async {
      if (error.response?.statusCode == 401) {
        // Refresh token logic
        final newToken = await _refreshToken();
        if (newToken != null) {
          // Retry request
          return handler.resolve(await _retry(error.requestOptions));
        }
      }
      handler.next(error);
    },
  );
}
```

---

## Storage Strategy

### Platform-Aware Storage

```dart
class SecureStorage {
  Future<String?> getToken() async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('auth_token');
    } else {
      return await _secureStorage.read(key: 'auth_token');
    }
  }
}
```

### Why Different Storage?

- **Web:** FlutterSecureStorage doesn't work → use SharedPreferences
- **Mobile:** SharedPreferences not encrypted → use FlutterSecureStorage

---

## PDF Caching System

### Cache Flow

```
1. User opens chapter
2. Check if PDF in cache
   ├─ YES → Load from file (instant)
   └─ NO  → Download & cache
              ├─ Show progress
              └─ Save to local storage
3. Display PDF
```

### Implementation

```dart
class PdfCacheService {
  Future<String?> getCachedFilePath(String url) async {
    final cacheKey = url.hashCode.toString();
    final file = File('${cacheDir.path}/$cacheKey.pdf');
    return await file.exists() ? file.path : null;
  }

  Future<String?> downloadAndCache(String url, {
    Function(double)? onProgress
  }) async {
    final filePath = '${cacheDir.path}/${url.hashCode}.pdf';
    await _dio.download(url, filePath, onReceiveProgress: (received, total) {
      onProgress?.call(received / total);
    });
    return filePath;
  }
}
```

### Usage in UI

```dart
// Check cache
String? cachedPath = await _cacheService.getCachedFilePath(pdfUrl);

if (cachedPath != null) {
  // Use cached file
  SfPdfViewer.file(cachedPath);
} else {
  // Download with progress
  final path = await _cacheService.downloadAndCache(
    pdfUrl,
    onProgress: (progress) {
      setState(() => _downloadProgress = progress);
    },
  );
  SfPdfViewer.file(path);
}
```

---

## Backend Compatibility

### Snake Case vs Camel Case

Backend uses snake_case, Flutter uses camelCase. Solution: Handle both in fromJson.

```dart
factory Book.fromJson(Map<String, dynamic> json) {
  return Book(
    id: json['id'] as int,
    // Handle both formats
    totalChapters: json['totalChapters'] ?? json['total_chapters'] ?? 0,
    createdAt: DateTime.parse(
      json['createdAt'] ?? json['created_at']
    ),
  );
}
```

### Nested Objects

```dart
// Backend: { cover_file: { path: "url" } }
// Flutter: coverImage: "url"

String? coverImg;
if (json['cover_file'] != null && json['cover_file'] is Map) {
  coverImg = json['cover_file']['path'] as String?;
}
```

---

## Error Handling

### Repository Level

```dart
Future<List<Book>> getBooks() async {
  try {
    final response = await _apiClient.get<List<dynamic>>('/books');
    return response.map((json) => Book.fromJson(json)).toList();
  } on DioException catch (e) {
    if (e.response?.statusCode == 401) {
      throw UnauthorizedException();
    }
    throw ApiException(e.message);
  }
}
```

### Provider Level

```dart
Future<void> loadBooks() async {
  state = state.copyWith(isLoading: true, error: null);
  try {
    final books = await _repository.getBooks();
    state = state.copyWith(books: books, isLoading: false);
  } on DioException catch (e) {
    String errorMessage = 'Không thể tải danh sách sách';
    if (e.response?.statusCode == 401) {
      errorMessage = 'Phiên đăng nhập hết hạn';
    }
    state = state.copyWith(isLoading: false, error: errorMessage);
  }
}
```

### UI Level

```dart
if (state.error != null) {
  return Center(
    child: Column(
      children: [
        Text(state.error!),
        ElevatedButton(
          onPressed: () => ref.read(provider.notifier).retry(),
          child: Text('Thử lại'),
        ),
      ],
    ),
  );
}
```

---

## Testing Strategy

### Unit Tests

```dart
test('AuthRepository.login saves token', () async {
  final mockStorage = MockSecureStorage();
  final repository = AuthRepository(mockApiClient, mockStorage);

  await repository.login(LoginRequest(...));

  verify(mockStorage.saveToken(any)).called(1);
});
```

### Widget Tests

```dart
testWidgets('LoginPage shows error on invalid credentials', (tester) async {
  await tester.pumpWidget(ProviderScope(child: LoginPage()));

  await tester.enterText(find.byKey(Key('email')), 'invalid@test.com');
  await tester.tap(find.byKey(Key('login_button')));
  await tester.pump();

  expect(find.text('Email hoặc mật khẩu không đúng'), findsOneWidget);
});
```

---

## Performance Optimizations

### 1. Image Caching

```dart
CachedNetworkImage(
  imageUrl: book.coverImage,
  placeholder: (context, url) => CircularProgressIndicator(),
  errorWidget: (context, url, error) => Icon(Icons.error),
)
```

### 2. List Optimization

```dart
ListView.builder(
  itemCount: books.length,
  itemBuilder: (context, index) {
    return BookCard(book: books[index]);
  },
)
```

### 3. Lazy Loading

```dart
// Load chapters only when needed
final chaptersProvider = StateNotifierProvider.family<...>((ref, bookId) {
  return ChaptersNotifier(repository, bookId);
});
```

---

## Security Best Practices

### 1. Token Storage

- Web: SharedPreferences (acceptable for web)
- Mobile: FlutterSecureStorage (encrypted)

### 2. API Security

- HTTPS only
- JWT tokens in headers
- Auto token refresh
- Logout on 401

### 3. Input Validation

```dart
String? _validateEmail(String? value) {
  if (value == null || value.isEmpty) {
    return 'Email không được để trống';
  }
  if (!value.contains('@')) {
    return 'Email không hợp lệ';
  }
  return null;
}
```

---

## Deployment

### Build Commands

**Android:**

```bash
flutter build apk --release
```

**iOS:**

```bash
flutter build ipa --release
```

**Web:**

```bash
flutter build web --release
```

### Environment Variables

```dart
class Environment {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://192.168.1.2:3000/api',
  );
}
```

Run with:

```bash
flutter run --dart-define=API_BASE_URL=https://api.production.com
```

---

## Troubleshooting

### Common Issues

1. **Hot reload not working**
   - Restart app with `R`
   - Check for syntax errors

2. **Token not persisting on web**
   - Use SharedPreferences, not FlutterSecureStorage

3. **PDF not loading**
   - Check CORS headers
   - Verify signed URL not expired
   - Check network connectivity

4. **Build errors**
   - Run `flutter clean`
   - Run `flutter pub get`
   - Check dependency versions

---

## Resources

- [Flutter Documentation](https://flutter.dev/docs)
- [Riverpod Documentation](https://riverpod.dev)
- [Dio Documentation](https://pub.dev/packages/dio)
- [Syncfusion PDF Viewer](https://pub.dev/packages/syncfusion_flutter_pdfviewer)
