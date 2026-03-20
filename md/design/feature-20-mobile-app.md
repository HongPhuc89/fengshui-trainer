# Detail Design: Flutter Mobile — Thiên Thư App

**Version:** 2.1
**Date:** 2026-03-20
**Status:** Confirmed (Updated after PO Review)
**Stack:** Flutter 3.x (Dart), Clean Architecture + BLoC pattern
**Location:** `src/mobile/` trong repo `fengshui-trainer`

---

## 1. Tổng quan

Clone toàn bộ ứng dụng web Vue.js sang Flutter mobile (iOS + Android). Tái sử dụng toàn bộ backend API hiện có — không thay đổi backend.

### Scope đầy đủ

| Module | Screens |
|--------|---------|
| Auth | Login, Register, DeviceLock |
| Home | Dashboard |
| Books | Danh sách, Chi tiết, Đọc PDF |
| Videos | Danh sách, Chi tiết, Xem video |
| Training | Flashcard, Quiz |
| Store | Ví, Lịch sử giao dịch |
| Profile | Thông tin cá nhân, Đổi mật khẩu, Quản lý thiết bị |

### Quyết định đã confirm

| # | Quyết định |
|---|-----------|
| A1 | Code tại `src/mobile/`, bundle ID `fengshui-trainer` |
| A2 | Toàn bộ app, clone từ web |
| B1 | Login email + password, kèm `device_id` trong request |
| B2 | Có refresh token, auto-refresh để hạn chế login lại |
| C1 | Option A: client-side AES-256-GCM decrypt |
| C2 | Screenshot prevention bắt buộc (FLAG_SECURE + iOS) |
| C3 | Swipe = chuyển trang trong cùng chapter |
| D1 | Dark mode only |
| D2 | Top/bottom bar tự động ẩn sau vài giây |
| D3 | Spinner đơn giản khi load PDF |
| E1 | Training screens nằm trong scope |
| F1 | iOS + Android cả hai |
| F2 | Bám theo UI/UX web |

---

## 2. Kiến trúc Flutter

### 2.1 Design Pattern: Clean Architecture + BLoC

```
src/mobile/
└── lib/
    ├── core/
    │   ├── api/              # Dio HTTP client, interceptors (JWT, refresh)
    │   ├── cache/            # Hive-based cache với TTL
    │   ├── error/            # Failures, exceptions
    │   ├── di/               # Dependency injection (get_it + injectable)
    │   ├── router/           # go_router config
    │   └── utils/            # Extensions, constants
    │
    ├── features/
    │   ├── auth/
    │   ├── home/
    │   ├── books/
    │   ├── videos/
    │   ├── training/
    │   ├── store/
    │   └── profile/
    │
    ├── shared/
    │   ├── widgets/          # AppBottomNav, BookCard, VideoCard, ...
    │   ├── theme/            # AppTheme, colors, typography
    │   └── l10n/             # Strings (VI only, EN stub)
    │
    └── main.dart
```

Mỗi feature theo cấu trúc:
```
features/{feature}/
├── data/
│   ├── datasources/    # RemoteDataSource (Dio)
│   ├── models/         # JSON → Dart (fromJson/toJson)
│   └── repositories/   # RepositoryImpl
├── domain/
│   ├── entities/       # Pure Dart entities
│   ├── repositories/   # Abstract interface
│   └── usecases/       # 1 use case = 1 class
└── presentation/
    ├── bloc/           # BLoC events/states
    ├── screens/        # Full screens
    └── widgets/        # Screen-local widgets
```

### 2.2 Packages

```yaml
dependencies:
  # State management
  flutter_bloc: ^8.1.6
  equatable: ^2.0.5

  # DI
  get_it: ^8.0.0
  injectable: ^2.4.0

  # HTTP
  dio: ^5.7.0

  # Navigation
  go_router: ^14.0.0

  # Storage
  hive_flutter: ^1.1.0
  flutter_secure_storage: ^9.2.2   # JWT tokens (Keychain/Keystore)

  # PDF
  pdfx: ^2.8.0

  # Crypto (AES-256-GCM)
  pointycastle: ^3.9.1

  # Video
  video_player: ^2.9.2
  chewie: ^1.8.5                   # Video player UI controls

  # Images
  cached_network_image: ^3.4.0
  image_cropper: ^7.1.0            # Avatar crop

  # Device
  device_info_plus: ^10.1.2        # Device ID (device name only)
  screen_protector: ^3.4.0         # Screenshot prevention (Android FLAG_SECURE + iOS)
  uuid: ^4.4.0                     # Stable device ID generation

  # Utils
  intl: ^0.19.0
  logger: ^2.4.0
  dartz: ^0.10.1                   # Either type

dev_dependencies:
  injectable_generator: ^2.6.0
  build_runner: ^2.4.0
  flutter_test:
    sdk: flutter
  bloc_test: ^9.1.7
  mocktail: ^1.0.4
```

---

## 3. Core Layer

### 3.1 API Client (Dio)

```dart
// core/api/api_client.dart
@singleton
class ApiClient {
  late final Dio _dio;

  ApiClient(AuthCubit authCubit) {
    _dio = Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl));

    // JWT interceptor
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        final token = authCubit.accessToken;
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          // Try refresh
          final refreshed = await authCubit.doRefresh();
          if (refreshed) {
            // Retry original request
            handler.resolve(await _dio.fetch(error.requestOptions));
            return;
          }
          authCubit.clearAuth();
        }
        handler.next(error);
      },
    ));
  }
}
```

### 3.2 Cache (Hive + TTL)

```dart
// core/cache/cache_service.dart
@singleton
class CacheService {
  static const _boxName = 'api_cache';

  Future<T?> get<T>(String key) async { ... }
  Future<void> set(String key, dynamic value, Duration ttl) async { ... }
  Future<void> delete(String key) async { ... }
  Future<void> clearAll() async { ... }  // gọi khi logout
}

// TTL constants (align với web)
class CacheTtl {
  static const categories = Duration(hours: 12);
  static const list       = Duration(hours: 1);
  static const recentlyX  = Duration(minutes: 5);
  // Chapter, decrypt-key, progress → không cache (DRM / real-time)
}
```

### 3.3 Auth Store (AuthCubit — lightweight BLoC)

**Quyết định:** Dùng `AuthCubit` thay `ChangeNotifier` để giữ nhất quán với toàn bộ codebase BLoC. Cubit là lightweight BLoC — không cần Event class, vẫn là global singleton, nhưng developer không phải học hai mental model.

```dart
// core/auth/auth_cubit.dart
@singleton
class AuthCubit extends Cubit<AuthState> {
  AuthCubit(this._secureStorage, this._cacheService)
      : super(AuthUnauthenticated());

  String? get accessToken => (state is AuthAuthenticated)
      ? (state as AuthAuthenticated).accessToken
      : null;

  bool get isAuthenticated => state is AuthAuthenticated;
  Future<void> setTokens(String access, String refresh, UserEntity user) async {
    await _secureStorage.write(key: 'access', value: access);
    await _secureStorage.write(key: 'refresh', value: refresh);
    emit(AuthAuthenticated(accessToken: access, refreshToken: refresh, user: user));
    _startAutoRefresh();
  }

  Future<bool> doRefresh() async { ... }

  void clearAuth() {
    _cacheService.clearAll();
    _stopAutoRefresh();
    emit(AuthUnauthenticated());
  }

  // Auto-refresh 5 phút trước khi hết hạn (align với web)
  void _startAutoRefresh() { ... }
}

// Auth states
abstract class AuthState {}
class AuthUnauthenticated extends AuthState {}
class AuthAuthenticated extends AuthState {
  final String accessToken;
  final String refreshToken;
  final UserEntity user;
  AuthAuthenticated({required this.accessToken, required this.refreshToken, required this.user});
}
```

### 3.4 Device Service

**Vấn đề:** `android.id` và `identifierForVendor` đều không ổn định — có thể thay đổi sau factory reset, reinstall, hoặc khi xóa hết app cùng vendor (iOS). Fallback `'unknown-ios'` sẽ khiến tất cả iOS user bị coi là cùng device.

**Giải pháp:** Sinh UUID một lần khi install, persist vào `flutter_secure_storage` (Keychain/Keystore). Dùng UUID này làm device ID ổn định suốt vòng đời app.

```dart
// core/device/device_service.dart
@singleton
class DeviceService {
  static const _deviceIdKey = 'device_stable_id';
  final FlutterSecureStorage _secureStorage;

  DeviceService(this._secureStorage);

  /// Trả về device ID ổn định:
  /// - Lần đầu: sinh UUID v4, lưu vào Keychain/Keystore
  /// - Lần sau: đọc từ Keychain/Keystore
  /// - Không thay đổi khi update app hoặc reinstall (vì Keychain iOS tồn tại qua uninstall)
  Future<String> getDeviceId() async {
    String? stored = await _secureStorage.read(key: _deviceIdKey);
    if (stored != null && stored.isNotEmpty) return stored;

    // Sinh UUID mới, persist ngay
    final newId = const Uuid().v4();
    await _secureStorage.write(key: _deviceIdKey, value: newId);
    return newId;
  }

  String get deviceType => Platform.isIOS ? 'ios' : 'android';

  Future<String> getDeviceName() async {
    final info = DeviceInfoPlugin();
    if (Platform.isIOS) {
      final ios = await info.iosInfo;
      return '${ios.name} (${ios.systemVersion})';
    } else {
      final android = await info.androidInfo;
      return '${android.model} (Android ${android.version.release})';
    }
  }
}
```

> **Note:** Thêm `uuid: ^4.4.0` vào pubspec. Trên iOS, Keychain data tồn tại kể cả sau khi uninstall app — device ID sẽ không đổi khi user reinstall.
```

### 3.5 Router (go_router)

```dart
// core/router/app_router.dart
final appRouter = GoRouter(
  redirect: (context, state) {
    final auth = getIt<AuthCubit>();
    final isAuth = auth.isAuthenticated;
    final isAuthRoute = state.uri.path.startsWith('/auth');

    if (!isAuth && !isAuthRoute) return '/auth/login';
    if (isAuth && isAuthRoute)  return '/';
    return null;
  },
  routes: [
    // Auth (no shell)
    GoRoute(path: '/auth/login',    builder: (_, __) => LoginScreen()),
    GoRoute(path: '/auth/register', builder: (_, __) => RegisterScreen()),

    // App shell (BottomNav)
    ShellRoute(
      builder: (_, __, child) => AppShell(child: child),
      routes: [
        GoRoute(path: '/',        builder: (_, __) => HomeScreen()),
        GoRoute(path: '/books',   builder: (_, __) => BooksScreen()),
        GoRoute(path: '/store',   builder: (_, __) => StoreScreen()),
        GoRoute(path: '/videos',  builder: (_, __) => VideosScreen()),
        GoRoute(path: '/profile', builder: (_, __) => ProfileScreen()),
      ],
    ),

    // Fullscreen (no shell)
    GoRoute(path: '/books/:slug',      builder: (_, s) => BookDetailScreen(slug: s.pathParameters['slug']!)),
    GoRoute(path: '/books/:slug/read', builder: (_, s) => BookReaderScreen(
      slug: s.pathParameters['slug']!,
      startChapter: int.tryParse(s.uri.queryParameters['chapter'] ?? ''),
    )),
    GoRoute(path: '/videos/:slug',                        builder: (_, s) => VideoDetailScreen(slug: s.pathParameters['slug']!)),
    GoRoute(path: '/videos/:slug/lessons/:lessonSlug',    builder: (_, s) => VideoPlayerScreen(
      courseSlug: s.pathParameters['slug']!,
      lessonSlug: s.pathParameters['lessonSlug']!,
    )),
    GoRoute(path: '/training/lesson/:lessonSlug',                    builder: (_, s) => TrainingScreen(lessonSlug: s.pathParameters['lessonSlug']!)),
    GoRoute(path: '/training/chapter/:bookSlug/:chapterOrder',       builder: (_, s) => TrainingScreen(
      bookSlug: s.pathParameters['bookSlug']!,
      chapterOrder: int.parse(s.pathParameters['chapterOrder']!),
    )),
  ],
);
```

---

## 4. Features

### 4.1 Auth Feature

#### Screens
- **LoginScreen** — Email + password form, "Quên mật khẩu" link, "Đăng ký" link
- **RegisterScreen** — Email, password, confirm password, terms checkbox
- **DeviceLockScreen** — Hiển thị khi backend trả 400 DEVICE_LIMIT_REACHED, thông tin thiết bị đang bind, nút "Yêu cầu reset"

#### AuthBloc

```dart
// Events
class LoginSubmitted extends AuthEvent {
  final String email, password;
}
class RegisterSubmitted extends AuthEvent {
  final String email, password;
}
class LogoutRequested extends AuthEvent {}
class DeviceResetRequested extends AuthEvent {}

// States
class AuthInitial extends AuthState {}
class AuthLoading extends AuthState {}
class AuthSuccess extends AuthState {}
class AuthError extends AuthState { final String message; }
class DeviceLocked extends AuthState {
  final String boundDeviceName;
  final DateTime nextResetAvailable;
}
```

#### Login Flow

```
LoginScreen
  → AuthBloc.add(LoginSubmitted(email, password))
  → DeviceService.getDeviceId() + getDeviceName()
  → POST /auth/login/ { email, password, device_id, device_type, device_name }
  → if 200: AuthCubit.setTokens() + fetchMe() → router.go('/')
  → if 400 DEVICE_LIMIT_REACHED: emit DeviceLocked → show DeviceLockScreen
  → if 401: emit AuthError "Sai email hoặc mật khẩu"
```

#### Device Reset Flow (DeviceLockScreen)

```
DeviceLockScreen hiển thị:
  - Tên thiết bị đang bind (từ DeviceLocked.boundDeviceName)
  - Thông tin cooldown: "Có thể reset sau: DD/MM/YYYY" (từ nextResetAvailable)
  - if nextResetAvailable <= now: nút "Yêu cầu đổi thiết bị" (active)
  - else: nút disabled + countdown text

Tap "Yêu cầu đổi thiết bị":
  → AuthBloc.add(DeviceResetRequested())
  → POST /users/me/device-reset/   ← endpoint từ Feature 1 backend
  → if 200: clearAuth() → login lại với device mới
  → if 400 COOLDOWN_NOT_EXPIRED: toast "Chưa đến thời gian reset"
```

---

### 4.2 App Shell

```dart
// shared/widgets/app_shell.dart
class AppShell extends StatelessWidget {
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: AppBottomNav(),
    );
  }
}

// shared/widgets/app_bottom_nav.dart
// 5 tabs: Home, Books, Store, Videos, Profile
// Dùng go_router context để detect active tab
NavigationBar(
  destinations: [
    NavigationDestination(icon: Icon(Icons.home), label: 'Trang chủ'),
    NavigationDestination(icon: Icon(Icons.menu_book), label: 'Sách'),
    NavigationDestination(icon: Icon(Icons.diamond_outlined), label: 'Kho báu'),
    NavigationDestination(icon: Icon(Icons.play_circle_outline), label: 'Video'),
    NavigationDestination(icon: Icon(Icons.person_outline), label: 'Hồ sơ'),
  ],
)
```

---

### 4.3 Home Feature

**HomeScreen layout:**
```
CustomScrollView:
  SliverAppBar: "Thiên Thư" + logo (pinned)
  SliverToBoxAdapter:
    ├── GreetingSection: "Chào, {name}!" + thời gian trong ngày
    ├── RecentlyReadSection (nếu có):
    │     HorizontalList: BookCard nhỏ (cover + chương đang đọc)
    ├── RecentlyWatchedSection (nếu có):
    │     HorizontalList: VideoCard nhỏ (thumbnail + bài đang xem)
    ├── NewBooksSection:
    │     HorizontalList: BookCard
    └── NewVideosSection:
          HorizontalList: VideoCard
```

**HomeBloc:**
```dart
class LoadHome extends HomeEvent {}
class HomeLoaded extends HomeState {
  final List<Book> recentlyRead;
  final List<Video> recentlyWatched;
  final List<Book> newBooks;
  final List<Video> newVideos;
}
```

---

### 4.4 Books Feature

#### 4.4.1 BooksScreen

```
AppBar: "Thư Viện" + search icon
Body:
  ├── SearchBar (expandable, ẩn khi không dùng)
  ├── CategoryFilterRow (horizontal scroll FilterChip)
  ├── SortRow (trailing dropdown: Mới nhất | Giá tăng | Giá giảm)
  └── GridView (2 cột, lazy load)
        └── BookCard
```

**BookCard Widget:**
```dart
Stack(children: [
  ClipRRect(
    borderRadius: BorderRadius.circular(8),
    child: CachedNetworkImage(imageUrl: book.coverImageUrl, fit: BoxFit.cover),
  ),
  // "Đang đọc" overlay
  if (isReading) Positioned(bottom: 0, left: 0, right: 0,
    child: Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(begin: Alignment.bottomCenter, ...),
      ),
      padding: EdgeInsets.all(8),
      child: Text('Ch.${progress.chapterOrder} · Tr.${progress.currentPage}',
        style: TextStyle(color: Colors.white, fontSize: 11)),
    ),
  ),
  // "MỚI" badge
  if (book.isNewRelease) Positioned(top: 6, right: 6,
    child: Container(
      padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: AppColors.primaryGold, borderRadius: ...),
      child: Text('MỚI', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
    ),
  ),
])
```

#### 4.4.2 BookDetailScreen

```
CustomScrollView:
  SliverAppBar(expandedHeight: 280, pinned: true):
    FlexibleSpaceBar: CachedNetworkImage(book.coverImageUrl) — parallax
  SliverToBoxAdapter:
    ├── Padding:
    │   ├── Text(book.title, style: headline)
    │   ├── Text(book.author, style: subtitle + secondary color)
    │   ├── CategoryChip
    │   ├── PriceSection: (VIP badge | "Miễn phí" | "{price} LT" + gem icon)
    │   ├── if hasPurchased: ContinueReadingButton
    │   │     → context.push('/books/{slug}/read?chapter={lastChapter}')
    │   ├── DescriptionSection (ExpandableText, max 4 dòng)
    │   └── ChapterListSection:
    │         Text("Danh sách chương", style: sectionTitle)
    │         ListView.builder(shrinkWrap: true, physics: NeverScrollableScrollPhysics())
    │           └── ChapterListItem × n
    └── Spacer (SafeArea bottom)
```

**ChapterListItem:**
```dart
ListTile(
  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
  leading: CircleAvatar(
    backgroundColor: AppColors.surface,
    child: Text('${chapter.order}', style: TextStyle(color: AppColors.primaryGold)),
  ),
  title: Text(chapter.title),
  subtitle: Text('${chapter.pageCount} trang', style: TextStyle(color: AppColors.textSecondary)),
  trailing: Row(mainAxisSize: MainAxisSize.min, children: [
    if (chapter.isDemo) _DemoBadge(),
    SizedBox(width: 4),
    if (!canAccess) Icon(Icons.lock_outline, color: AppColors.lockGray)
    else if (isCompleted) Icon(Icons.check_circle, color: Colors.green),
  ]),
  onTap: () {
    if (canAccess) context.push('/books/$slug/read?chapter=${chapter.order}');
    else _showPurchaseSheet(context);
  },
)
```

**Purchase BottomSheet:**
```dart
showModalBottomSheet(context: context, builder: (_) =>
  Padding(padding: EdgeInsets.all(24), child:
    Column(mainAxisSize: MainAxisSize.min, children: [
      _BottomSheetHandle(),
      SizedBox(height: 16),
      Text('Mua sách', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
      SizedBox(height: 20),
      Row(children: [
        CachedNetworkImage(imageUrl: book.coverImageUrl, width: 60, height: 80),
        SizedBox(width: 16),
        Expanded(child: Text(book.title)),
      ]),
      SizedBox(height: 20),
      _PriceRow(label: 'Giá', value: '${book.priceLt} LT'),
      _PriceRow(label: 'Số dư', value: '${balance} LT',
        valueColor: balance < book.priceLt ? Colors.red : null),
      if (balance < book.priceLt)
        Padding(
          padding: EdgeInsets.only(top: 8),
          child: Text('Số dư không đủ. Liên hệ admin để nạp thêm.',
            style: TextStyle(color: Colors.red, fontSize: 12)),
        ),
      SizedBox(height: 20),
      SizedBox(width: double.infinity,
        child: ElevatedButton(
          onPressed: balance >= book.priceLt ? _onConfirmPurchase : null,
          child: Text('Xác nhận mua'),
        ),
      ),
    ]),
  ),
);
```

#### 4.4.3 BookReaderScreen

**Layout:**
```dart
Scaffold(
  backgroundColor: Colors.black,
  body: Stack(children: [
    // Layer 1: PDF Viewer
    Positioned.fill(child:
      GestureDetector(
        onTap: _toggleControls,      // tap giữa màn hình → show/hide controls
        onHorizontalDragEnd: _onSwipe,
        child: state is ChapterLoaded
          ? PdfView(controller: _pdfController)
          : Center(child: CircularProgressIndicator(color: AppColors.primaryGold)),
      ),
    ),

    // Layer 2: Watermark (always visible)
    if (state is ChapterLoaded) Positioned.fill(child:
      WatermarkOverlay(text: '${user.name}\n${user.phone}'),
    ),

    // Layer 3: DRM Blur (khi app background)
    if (state.isBlurred) Positioned.fill(child: BlurOverlay()),

    // Layer 4: TOC Overlay
    if (state.tocVisible) ...[
      // Backdrop
      Positioned.fill(child:
        GestureDetector(
          onTap: () => bloc.add(ToggleToc()),
          child: Container(color: Colors.black54),
        ),
      ),
      // TOC Panel
      AnimatedPositioned(
        duration: Duration(milliseconds: 250),
        curve: Curves.easeOut,
        left: 0, top: 0, bottom: 0,
        width: MediaQuery.of(context).size.width * 0.75,
        child: TocPanel(chapters: book.chapters, currentOrder: currentChapter),
      ),
    ],

    // Layer 5: Top Bar (auto-hide)
    AnimatedPositioned(
      duration: Duration(milliseconds: 200),
      top: _controlsVisible ? 0 : -120,
      left: 0, right: 0,
      child: ReaderTopBar(book: book, chapter: chapter),
    ),

    // Layer 6: Bottom Bar (auto-hide)
    AnimatedPositioned(
      duration: Duration(milliseconds: 200),
      bottom: _controlsVisible ? 0 : -100,
      left: 0, right: 0,
      child: ReaderBottomBar(chapter: chapter, currentPage: currentPage),
    ),
  ]),
)
```

**Auto-hide controls:**
```dart
Timer? _hideTimer;

void _toggleControls() {
  setState(() => _controlsVisible = !_controlsVisible);
  if (_controlsVisible) _scheduleHide();
}

void _scheduleHide() {
  _hideTimer?.cancel();
  _hideTimer = Timer(const Duration(seconds: 3), () {
    if (mounted) setState(() => _controlsVisible = false);
  });
}
```

**DRM — Screenshot prevention (Android + iOS):**

Dùng `screen_protector` thay `flutter_windowmanager` — hỗ trợ cả Android (FLAG_SECURE) và iOS (native `allowScreenCapture`):

```dart
import 'package:screen_protector/screen_protector.dart';

// Khi enter BookReaderScreen hoặc VideoPlayerScreen:
@override
void initState() {
  super.initState();
  ScreenProtector.preventScreenshotOn();     // Android: FLAG_SECURE, iOS: native
  ScreenProtector.protectDataLeakageOn();    // iOS: blur app snapshot in app switcher
}

// Khi exit:
@override
void dispose() {
  ScreenProtector.preventScreenshotOff();
  ScreenProtector.protectDataLeakageOff();
  super.dispose();
}
```

> `protectDataLeakageOn()` trên iOS blur màn hình trong App Switcher — ngăn lộ nội dung PDF/video khi người dùng chụp ảnh từ task switcher.

**ReaderTopBar:**
```dart
SafeArea(
  child: Container(
    height: 56,
    decoration: BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [Colors.black87, Colors.transparent],
      ),
    ),
    child: Row(children: [
      IconButton(icon: Icon(Icons.arrow_back, color: Colors.white), onPressed: context.pop),
      Expanded(child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(chapter.title, style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
          Text(book.title, style: TextStyle(color: Colors.white70, fontSize: 12), overflow: TextOverflow.ellipsis),
        ],
      )),
      IconButton(icon: Icon(Icons.list, color: Colors.white), onPressed: () => bloc.add(ToggleToc())),
      if (chapter.hasTrainingSet)
        IconButton(icon: Icon(Icons.school_outlined, color: AppColors.primaryGold),
          onPressed: () => context.push('/training/chapter/${book.slug}/${chapter.order}')),
    ]),
  ),
)
```

**ReaderBottomBar:**
```dart
SafeArea(
  child: Container(
    decoration: BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.bottomCenter,
        end: Alignment.topCenter,
        colors: [Colors.black87, Colors.transparent],
      ),
    ),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      SliderTheme(
        data: SliderThemeData(trackHeight: 2, thumbRadius: 6),
        child: Slider(
          value: currentPage.toDouble(),
          min: 1.0,
          max: chapter.pageCount.toDouble(),
          activeColor: AppColors.primaryGold,
          inactiveColor: Colors.white30,
          onChanged: (v) => bloc.add(ChangePage(v.round())),
        ),
      ),
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(icon: Icon(Icons.chevron_left, color: Colors.white),
            onPressed: currentPage > 1 ? () => bloc.add(ChangePage(currentPage - 1)) : null),
          Text('$currentPage / ${chapter.pageCount}',
            style: TextStyle(color: Colors.white, fontSize: 14)),
          IconButton(icon: Icon(Icons.chevron_right, color: Colors.white),
            onPressed: currentPage < chapter.pageCount ? () => bloc.add(ChangePage(currentPage + 1)) : null),
        ],
      ),
    ]),
  ),
)
```

**WatermarkOverlay:**
```dart
class WatermarkOverlay extends StatelessWidget {
  final String text;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: SizedBox.expand(
        child: CustomPaint(painter: WatermarkPainter(text: text)),
      ),
    );
  }
}

class WatermarkPainter extends CustomPainter {
  final String text;

  @override
  void paint(Canvas canvas, Size size) {
    final tp = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(color: Colors.grey.withOpacity(0.12), fontSize: 13),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    canvas.save();
    canvas.rotate(-pi / 6);
    for (double y = -size.height; y < size.height * 2; y += 120) {
      for (double x = -size.width; x < size.width * 2; x += 200) {
        tp.paint(canvas, Offset(x, y));
      }
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}
```

**PDF Decryption Service:**
```dart
@singleton
class PdfDecryptionService {
  Future<Uint8List> decrypt({
    required String encryptedCdnUrl,
    required Uint8List keyBytes,
  }) async {
    // 1. Fetch encrypted bytes
    final res = await Dio().get<List<int>>(
      encryptedCdnUrl,
      options: Options(responseType: ResponseType.bytes),
    );
    final encrypted = Uint8List.fromList(res.data!);

    // 2. Extract IV (first 12 bytes)
    final iv = encrypted.sublist(0, 12);
    final ciphertext = encrypted.sublist(12);

    // 3. AES-256-GCM decrypt
    final cipher = GCMBlockCipher(AESEngine())
      ..init(false, AEADParameters(
        KeyParameter(keyBytes), 128, iv, Uint8List(0),
      ));
    final out = Uint8List(cipher.getOutputSize(ciphertext.length));
    final len = cipher.processBytes(ciphertext, 0, ciphertext.length, out, 0);
    cipher.doFinal(out, len);

    return out; // PDF bytes in memory, never written to disk
  }
}
```

**BookReaderBloc:**
```dart
// Progress auto-save (debounce 1s)
Timer? _progressTimer;

void _onChangePage(ChangePage event, Emitter<BookReaderState> emit) {
  final s = state as ChapterLoaded;
  _progressTimer?.cancel();
  _progressTimer = Timer(const Duration(seconds: 1), () {
    _saveProgressUseCase(s.chapter.order, event.page);
  });
  emit(s.copyWith(currentPage: event.page));
  _pdfController.jumpToPage(event.page - 1);  // pdfx 0-indexed
}

// DRM lifecycle
void _onAppBackgrounded(_, Emitter emit) =>
    emit((state as ChapterLoaded).copyWith(isBlurred: true));
void _onAppForegrounded(_, Emitter emit) =>
    emit((state as ChapterLoaded).copyWith(isBlurred: false));
```

---

### 4.5 Videos Feature

#### VideosScreen
Tương tự BooksScreen: grid 2 cột, filter category, search, sort, "Đang xem" badge với % progress.

#### VideoDetailScreen
Tương tự BookDetailScreen với:
- Thumbnail thay cover
- Danh sách bài học thay chapters
- `ContinueWatchingButton` → `/videos/{slug}/lessons/{lessonSlug}`

#### VideoPlayerScreen

```
Scaffold:
  body: Stack(children: [
    // Layer 1: Full content area
    Column(children: [
      // Video area (16:9 ratio)
      AspectRatio(
        aspectRatio: 16 / 9,
        child: Chewie(controller: _chewieController),
      ),
      // Tabs: Bài học | Flashcard | Quiz
      TabBar(tabs: [
        Tab(text: 'Bài học'),
        Tab(text: 'Flashcard'),   // visible only if has flashcards
        Tab(text: 'Quiz'),        // visible only if has quiz
      ]),
      Expanded(child: TabBarView(children: [
        LessonListTab(),
        FlashcardTab(),
        QuizTab(),
      ])),
    ]),

    // Layer 2: Video Watermark (floating, random position)
    VideoWatermarkOverlay(text: user.email),
  ])
```

**VideoWatermarkOverlay** — Hiển thị **email user**, bay random liên tục trên vùng video. Vị trí thay đổi mỗi 30 giây, hiển thị 5 giây/lần (align với `security-drm.md`):

```dart
class VideoWatermarkOverlay extends StatefulWidget {
  final String text;   // user.email
  const VideoWatermarkOverlay({required this.text});

  @override
  State<VideoWatermarkOverlay> createState() => _VideoWatermarkOverlayState();
}

class _VideoWatermarkOverlayState extends State<VideoWatermarkOverlay> {
  Timer? _timer;
  bool _visible = false;
  // Lưu offset ngẫu nhiên thay vì 4 góc cố định — bay tự do hơn
  double _top = 48;
  double _left = 12;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (!mounted) return;
      final size = MediaQuery.of(context).size;
      // Tính vị trí ngẫu nhiên trong vùng video (16:9 → height = width * 9/16)
      final videoHeight = size.width * 9 / 16;
      setState(() {
        _visible = true;
        _top  = 8 + Random().nextDouble() * (videoHeight - 40);
        _left = 8 + Random().nextDouble() * (size.width - 160);
      });
      Future.delayed(const Duration(seconds: 5), () {
        if (mounted) setState(() => _visible = false);
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_visible) return const SizedBox.shrink();
    return Positioned(
      top: _top,
      left: _left,
      child: IgnorePointer(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.45),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            widget.text,
            style: const TextStyle(color: Colors.white70, fontSize: 11),
          ),
        ),
      ),
    );
  }
}
```

**Video progress:** Save mỗi 5 giây khi đang xem (align với web):
```dart
_chewieController.videoPlayerController.addListener(() {
  final pos = _chewieController.videoPlayerController.value.position;
  _debounce(() => _saveProgress(pos.inSeconds));
});
```

---

### 4.6 Training Feature

#### TrainingScreen

```
Scaffold:
  AppBar: "Luyện tập" + back button
  body: BlocBuilder<TrainingBloc, TrainingState>(
    builder: (context, state) {
      if (state is TrainingLoaded) {
        return state.selectedActivity == null
          ? TrainingModeSelector(activities: state.activities)
          : state.selectedActivity!.type == ActivityType.flashcard
            ? FlashcardSession(activityId: state.selectedActivity!.id)
            : QuizSession(activityId: state.selectedActivity!.id);
      }
      ...
    },
  )
```

#### TrainingModeSelector
Grid 2 cột hiển thị các activity cards. Mỗi card:
- FLASHCARD: icon thẻ bài + "X thẻ" (total_count)
- QUIZ: icon câu hỏi + "X câu" (question_count)

#### FlashcardSession
- Fetch 20 random cards từ `/training/activities/{id}/flashcards/`
- Card flip animation (AnimationController, 0.5s)
- Prev/Next navigation
- Progress indicator (3/20)
- Completion screen: "Lấy bộ mới ngẫu nhiên" button

#### QuizSession
- Fetch exam từ `/training/activities/{id}/exam/`
- Multiple choice UI, instant feedback (đúng/sai highlight)
- Score screen + "Làm lại" button

---

### 4.7 Store Feature

#### StoreScreen

```
Scaffold:
  AppBar: "Kho báu"
  body: Column(children: [
    // Balance card
    Container(
      margin: EdgeInsets.all(16),
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [Color(0xFF1A1A2E), Color(0xFF16213E)]),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primaryGold.withOpacity(0.3)),
      ),
      child: Row(children: [
        Icon(Icons.diamond, color: AppColors.primaryGold, size: 32),
        SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Số dư', style: TextStyle(color: AppColors.textSecondary)),
          Text('${balance} LT', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.primaryGold)),
        ]),
      ]),
    ),
    // Contact info
    Padding(padding: EdgeInsets.symmetric(horizontal: 16),
      child: Text('Liên hệ admin để nạp thêm Linh Thạch', ...),
    ),
    Divider(),
    // Transaction history
    Expanded(child: ListView.builder(
      itemBuilder: (_, i) => TransactionItem(tx: transactions[i]),
    )),
  ])
```

---

### 4.8 Profile Feature

#### ProfileScreen

```
CustomScrollView:
  SliverAppBar: "Hồ sơ cá nhân"
  SliverToBoxAdapter:
    ├── AvatarSection: CircleAvatar + edit icon → ImageCropper
    ├── InfoSection: Tên, Email (read-only)
    ├── EditNameSection: TextField + save button
    ├── ChangePasswordSection: old/new/confirm password
    ├── DeviceSection:
    │     Text: "Thiết bị đang dùng: ${deviceName}"
    │     if canReset: OutlinedButton("Yêu cầu đổi thiết bị")
    │     else: Text("Có thể reset sau: ${daysLeft} ngày")
    └── LogoutButton (màu đỏ)
```

---

## 5. UI/UX Spec

### 5.1 Color Tokens

```dart
// shared/theme/app_colors.dart
class AppColors {
  static const primaryGold   = Color(0xFFC9A84C);
  static const background    = Color(0xFF1A1A2E);
  static const surface       = Color(0xFF16213E);
  static const surfaceAlt    = Color(0xFF0F3460);
  static const textPrimary   = Color(0xFFF0F0F0);
  static const textSecondary = Color(0xFF9E9E9E);
  static const lockGray      = Color(0xFF616161);
  static const demoBadge     = Color(0xFFFFC107);
  static const error         = Color(0xFFCF6679);
}
```

### 5.2 Typography

```dart
// shared/theme/app_theme.dart
ThemeData get appTheme => ThemeData(
  brightness: Brightness.dark,
  scaffoldBackgroundColor: AppColors.background,
  colorScheme: ColorScheme.dark(
    primary: AppColors.primaryGold,
    surface: AppColors.surface,
  ),
  textTheme: TextTheme(
    headlineMedium: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
    titleMedium:    TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
    bodyMedium:     TextStyle(fontSize: 14, color: AppColors.textPrimary),
    bodySmall:      TextStyle(fontSize: 12, color: AppColors.textSecondary),
  ),
);
```

### 5.3 Responsive (Phone vs Tablet)

| Element | Phone (< 600dp) | Tablet (≥ 600dp) |
|---------|----------------|-----------------|
| Books grid | 2 cột | 3 cột |
| TOC | Overlay 75% | Fixed panel 35% |
| Video player | Fullscreen portrait | Split: video trái + tabs phải |

### 5.4 Transitions & Animations

| Element | Animation |
|---------|-----------|
| Screen push | Slide từ phải (default go_router) |
| TOC open/close | Slide từ trái 250ms ease-out |
| Controls show/hide (reader) | Slide up/down 200ms |
| Flashcard flip | Rotate Y 180° 300ms |
| BlurOverlay | Instant (DRM) |
| Purchase modal | BottomSheet slide-up |

---

## 6. API Integration

### 6.1 Cache Policy

| Endpoint | TTL |
|----------|-----|
| `/api/books/categories/` | 12h |
| `/api/books/` | 1h |
| `/api/books/recently-read/` | 5m |
| `/api/books/{slug}/` | 1h |
| `/api/videos/categories/` | 12h |
| `/api/videos/` | 1h |
| `/api/videos/recently-watched/` | 5m |
| `/api/videos/{slug}/` | 1h |
| `/api/training/lesson/{slug}/` | 15m |
| `/api/training/chapter/{slug}/{order}/` | 15m |
| `/api/training/activities/{id}/flashcards/` | 10m |
| `/api/training/activities/{id}/exam/` | **NO CACHE** (fresh mỗi session) |
| `/api/books/{slug}/chapters/{order}/` | **NO CACHE** (DRM) |
| `/api/books/{slug}/chapters/{order}/decrypt-key/` | **NO CACHE** (DRM) |
| `/api/books/{slug}/progress/` | **NO CACHE** |
| `/api/videos/{slug}/progress/` | **NO CACHE** |

### 6.2 Error Handling

| HTTP | Xử lý |
|------|-------|
| 400 `DEVICE_LIMIT_REACHED` | Navigate DeviceLockScreen |
| 401 | Auto-refresh token → nếu fail → logout + navigate Login |
| 403 | Hiển thị BottomSheet mua sách/video |
| 202 `PDF_GENERATING` | Spinner + auto-retry sau 3s (max 5 lần). Sau max retry: hiển thị "PDF đang được chuẩn bị, vui lòng thử lại sau ít phút" + nút "Thử lại thủ công" |
| 404 | Error screen "Không tìm thấy" |
| 5xx | Error screen + retry button |

---

## 7. File Structure đầy đủ

```
src/mobile/
└── lib/
    ├── core/
    │   ├── api/
    │   │   ├── api_client.dart
    │   │   └── api_endpoints.dart
    │   ├── cache/
    │   │   └── cache_service.dart
    │   ├── auth/
    │   │   └── auth_cubit.dart     # AuthCubit + AuthState (singleton)
    │   ├── device/
    │   │   └── device_service.dart
    │   ├── pdf/
    │   │   └── pdf_decryption_service.dart
    │   ├── di/
    │   │   └── injection.dart
    │   ├── router/
    │   │   └── app_router.dart
    │   └── error/
    │       ├── exceptions.dart
    │       └── failures.dart
    │
    ├── features/
    │   ├── auth/
    │   │   ├── data/
    │   │   │   ├── datasources/auth_remote_datasource.dart
    │   │   │   ├── models/user_model.dart
    │   │   │   └── repositories/auth_repository_impl.dart
    │   │   ├── domain/
    │   │   │   ├── entities/user.dart
    │   │   │   ├── repositories/auth_repository.dart
    │   │   │   └── usecases/ [Login, Register, Logout, ResetDevice]
    │   │   └── presentation/
    │   │       ├── bloc/ [AuthBloc]
    │   │       ├── screens/ [LoginScreen, RegisterScreen, DeviceLockScreen]
    │   │       └── widgets/ [LoginForm, RegisterForm]
    │   │
    │   ├── home/
    │   │   # Không có data/domain layer riêng.
    │   │   # HomeBloc inject trực tiếp use cases từ books/ và videos/ features.
    │   │   └── presentation/
    │   │       ├── bloc/ [HomeBloc]
    │   │       └── screens/ [HomeScreen]
    │   │
    │   ├── books/
    │   │   ├── data/
    │   │   │   ├── datasources/books_remote_datasource.dart
    │   │   │   ├── models/ [BookModel, ChapterModel, ReadingProgressModel]
    │   │   │   └── repositories/books_repository_impl.dart
    │   │   ├── domain/
    │   │   │   ├── entities/ [Book, BookChapterMeta, BookChapterContent, ReadingProgress]
    │   │   │   ├── repositories/books_repository.dart
    │   │   │   └── usecases/ [GetBooks, GetBookDetail, GetRecentlyRead, GetChapter,
    │   │   │                   LoadDecryptPdf, GetReadingProgress, SaveReadingProgress,
    │   │   │                   PurchaseBook]
    │   │   └── presentation/
    │   │       ├── bloc/ [BooksBloc, BookDetailBloc, BookReaderBloc]
    │   │       ├── screens/ [BooksScreen, BookDetailScreen, BookReaderScreen]
    │   │       └── widgets/ [BookCard, ChapterListItem, PurchaseBottomSheet,
    │   │                     TocPanel, ReaderTopBar, ReaderBottomBar,
    │   │                     WatermarkOverlay, BlurOverlay]
    │   │
    │   ├── videos/
    │   │   ├── data/ [datasources, models, repositories]
    │   │   ├── domain/ [entities, repositories, usecases]
    │   │   └── presentation/
    │   │       ├── bloc/ [VideosBloc, VideoDetailBloc, VideoPlayerBloc]
    │   │       ├── screens/ [VideosScreen, VideoDetailScreen, VideoPlayerScreen]
    │   │       └── widgets/ [VideoCard, LessonListTab, FlashcardTab, QuizTab]
    │   │
    │   ├── training/
    │   │   ├── data/ [datasources, models, repositories]
    │   │   ├── domain/ [entities, repositories, usecases]
    │   │   └── presentation/
    │   │       ├── bloc/ [TrainingBloc, FlashcardBloc, QuizBloc]
    │   │       ├── screens/ [TrainingScreen]
    │   │       └── widgets/ [TrainingModeSelector, ActivityCard,
    │   │                     FlashcardSession, FlashcardCard,
    │   │                     QuizSession, QuizQuestion]
    │   │
    │   ├── store/
    │   │   ├── data/
    │   │   │   ├── datasources/wallet_remote_datasource.dart  # GET /wallet/me/, /wallet/history/
    │   │   │   ├── models/ [WalletModel, TransactionModel]
    │   │   │   └── repositories/wallet_repository_impl.dart
    │   │   ├── domain/
    │   │   │   ├── entities/ [Wallet, Transaction]
    │   │   │   ├── repositories/wallet_repository.dart
    │   │   │   └── usecases/ [GetBalance, GetTransactions]
    │   │   └── presentation/
    │   │       ├── bloc/ [StoreBloc]
    │   │       ├── screens/ [StoreScreen]
    │   │       └── widgets/ [BalanceCard, TransactionItem]
    │   │
    │   └── profile/
    │       ├── data/ [datasources, models, repositories]
    │       ├── domain/ [entities, repositories, usecases]
    │       └── presentation/
    │           ├── bloc/ [ProfileBloc]
    │           ├── screens/ [ProfileScreen]
    │           └── widgets/ [AvatarSection, DeviceSection]
    │
    ├── shared/
    │   ├── theme/
    │   │   ├── app_theme.dart
    │   │   └── app_colors.dart
    │   └── widgets/
    │       ├── app_shell.dart
    │       ├── app_bottom_nav.dart
    │       ├── gem_icon.dart
    │       └── loading_overlay.dart
    │
    └── main.dart
```

---

## 8. Implementation Order

| Bước | Nội dung | Phụ thuộc |
|------|----------|-----------|
| 1 | Flutter project setup (`flutter create`), folder structure, pubspec | — |
| 2 | Core layer: Dio client, CacheService, AuthStore, DeviceService | 1 |
| 3 | Router (go_router) + AppShell + BottomNav | 2 |
| 4 | Auth: Login/Register/DeviceLock screens + AuthBloc | 2, 3 |
| 5 | Home: HomeScreen + HomeBloc | 4 |
| 6 | Books listing: BooksScreen + BooksBloc | 4 |
| 7 | Book detail: BookDetailScreen + purchase flow | 6 |
| 8 | PdfDecryptionService (unit test riêng) | 2 |
| 9 | BookReaderBloc + BookReaderScreen (watermark, blur, auto-hide) | 7, 8 |
| 10 | Videos listing + detail (pattern tương tự books) | 4 |
| 11 | VideoPlayerScreen (Chewie + tabs) | 10 |
| 12 | Training: TrainingScreen + Flashcard + Quiz | 4 |
| 13 | Store: StoreScreen | 4 |
| 14 | Profile: ProfileScreen + avatar crop + device management | 4 |
| 15 | Screenshot prevention (FLAG_SECURE) tích hợp vào BookReader + VideoPlayer | 9, 11 |
| 16 | Integration test end-to-end happy path | 15 |

---

## 9. Trade-offs & Rủi ro

| Vấn đề | Quyết định | Lý do |
|--------|-----------|-------|
| PDF renderer | `pdfx` | API tốt hơn cho byte loading, maintained |
| AES decrypt | `pointycastle` | Pure Dart, không cần native bridge |
| Screenshot | `screen_protector` (Android FLAG_SECURE + iOS native) | Hỗ trợ cả hai platform trong một package, bao gồm cả App Switcher blur trên iOS |
| Video player | `chewie` + `video_player` | Chuẩn Flutter, hỗ trợ HLS (Bunny Stream) |
| Auth state | `AuthCubit` singleton (lightweight BLoC) | Nhất quán với toàn bộ codebase BLoC, không cần hai mental model |
| JWT storage | `flutter_secure_storage` | Lưu vào Keychain (iOS) / Keystore (Android), an toàn hơn SharedPrefs |
| Offline | Không support | Tránh phức tạp DRM key management khi offline |
| PDF in memory | Chapter load toàn bộ vào RAM | Chapter PDF ≈ 1-5MB, acceptable |
