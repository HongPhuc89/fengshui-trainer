import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_cubit.dart';
import '../di/injection.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/home/presentation/screens/home_screen.dart';
import '../../features/books/presentation/screens/books_screen.dart';
import '../../features/books/presentation/screens/book_detail_screen.dart';
import '../../features/books/presentation/screens/book_reader_screen.dart';
import '../../features/videos/presentation/screens/videos_screen.dart';
import '../../features/videos/presentation/screens/video_detail_screen.dart';
import '../../features/videos/presentation/screens/video_player_screen.dart';
import '../../features/training/presentation/screens/training_screen.dart';
import '../../features/store/presentation/screens/store_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../shared/widgets/app_shell.dart';

GoRouter buildAppRouter() {
  final authCubit = getIt<AuthCubit>();

  return GoRouter(
    refreshListenable: _AuthCubitListenable(authCubit),
    redirect: (context, state) {
      final isAuth = authCubit.isAuthenticated;
      final path = state.uri.path;
      final isAuthRoute = path.startsWith('/auth');

      if (!isAuth && !isAuthRoute) return '/auth/login';
      if (isAuth && isAuthRoute && path != '/auth/device-locked') return '/';
      return null;
    },
    routes: [
      // Auth routes (no shell)
      GoRoute(
        path: '/auth/login',
        builder: (_, __) => const LoginScreen(),
      ),
      // App shell with bottom nav
      ShellRoute(
        builder: (_, __, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: '/',
            builder: (_, __) => const HomeScreen(),
          ),
          GoRoute(
            path: '/books',
            builder: (_, __) => const BooksScreen(),
          ),
          GoRoute(
            path: '/store',
            builder: (_, __) => const StoreScreen(),
          ),
          GoRoute(
            path: '/videos',
            builder: (_, __) => const VideosScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (_, __) => const ProfileScreen(),
          ),
        ],
      ),

      // Fullscreen routes (no bottom nav)
      GoRoute(
        path: '/books/:slug',
        builder: (_, s) =>
            BookDetailScreen(slug: s.pathParameters['slug']!),
      ),
      GoRoute(
        path: '/books/:slug/read',
        builder: (_, s) => BookReaderScreen(
          slug: s.pathParameters['slug']!,
          startChapter:
              int.tryParse(s.uri.queryParameters['chapter'] ?? ''),
        ),
      ),
      GoRoute(
        path: '/videos/:slug',
        builder: (_, s) =>
            VideoDetailScreen(slug: s.pathParameters['slug']!),
      ),
      GoRoute(
        path: '/videos/:slug/lessons/:lessonSlug',
        builder: (_, s) => VideoPlayerScreen(
          courseSlug: s.pathParameters['slug']!,
          lessonSlug: s.pathParameters['lessonSlug']!,
        ),
      ),
      GoRoute(
        path: '/training/lesson/:lessonSlug',
        builder: (_, s) => TrainingScreen(
          lessonSlug: s.pathParameters['lessonSlug'],
        ),
      ),
      GoRoute(
        path: '/training/chapter/:bookSlug/:chapterOrder',
        builder: (_, s) => TrainingScreen(
          bookSlug: s.pathParameters['bookSlug'],
          chapterOrder:
              int.tryParse(s.pathParameters['chapterOrder'] ?? ''),
        ),
      ),
    ],
  );
}

/// Makes GoRouter react to AuthCubit state changes
class _AuthCubitListenable extends ChangeNotifier {
  _AuthCubitListenable(AuthCubit cubit) {
    cubit.stream.listen((_) => notifyListeners());
  }
}
