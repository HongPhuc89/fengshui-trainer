import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/config/theme.dart';
import 'features/auth/presentation/pages/login_page.dart';
import 'features/auth/presentation/pages/register_page.dart';
import 'features/auth/presentation/providers/auth_provider.dart';
import 'features/books/presentation/pages/book_detail_page.dart';
import 'features/books/presentation/pages/books_list_page.dart';
import 'features/chapters/presentation/pages/chapter_detail_page.dart';
import 'features/flashcards/presentation/pages/flashcards_page.dart';
import 'features/mindmap/presentation/pages/mindmap_page.dart';
import 'features/quiz/presentation/pages/quiz_page.dart';
import 'features/quiz/presentation/pages/quiz_results_page.dart';

void main() {
  runApp(const ProviderScope(child: MyApp()));
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch auth provider to ensure it's initialized
    final authState = ref.watch(authProvider);
    
    final router = GoRouter(
      initialLocation: '/login',
      redirect: (context, state) {
        final isAuthenticated = authState.isAuthenticated;
        final isGoingToLogin = state.matchedLocation == '/login';
        final isGoingToRegister = state.matchedLocation == '/register';

        // Debug logging
        print('🔍 Router redirect check:');
        print('   - isAuthenticated: $isAuthenticated');
        print('   - Current location: ${state.matchedLocation}');
        print('   - User: ${authState.user?.email ?? "null"}');

        if (!isAuthenticated && !isGoingToLogin && !isGoingToRegister) {
          print('   ➡️ Redirecting to /login (not authenticated)');
          return '/login';
        }

        if (isAuthenticated && (isGoingToLogin || isGoingToRegister)) {
          print('   ➡️ Redirecting to /home (already authenticated)');
          return '/home';
        }

        print('   ✅ No redirect needed');
        return null;
      },
      routes: [
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginPage(),
        ),
        GoRoute(
          path: '/register',
          builder: (context, state) => const RegisterPage(),
        ),
        GoRoute(
          path: '/home',
          builder: (context, state) => const BooksListPage(),
        ),
        GoRoute(
          path: '/books/:id',
          builder: (context, state) {
            final id = int.parse(state.pathParameters['id']!);
            return BookDetailPage(bookId: id);
          },
        ),
        GoRoute(
          path: '/books/:bookId/chapters/:chapterId',
          builder: (context, state) {
            final bookId = int.parse(state.pathParameters['bookId']!);
            final chapterId = int.parse(state.pathParameters['chapterId']!);
            return ChapterDetailPage(bookId: bookId, chapterId: chapterId);
          },
        ),
        GoRoute(
          path: '/books/:bookId/chapters/:chapterId/flashcards',
          builder: (context, state) {
            final bookId = int.parse(state.pathParameters['bookId']!);
            final chapterId = int.parse(state.pathParameters['chapterId']!);
            return FlashcardsPage(bookId: bookId, chapterId: chapterId);
          },
        ),
        GoRoute(
          path: '/books/:bookId/chapters/:chapterId/quiz',
          builder: (context, state) {
            final bookId = int.parse(state.pathParameters['bookId']!);
            final chapterId = int.parse(state.pathParameters['chapterId']!);
            return QuizPage(bookId: bookId, chapterId: chapterId);
          },
        ),
        GoRoute(
          path: '/books/:bookId/chapters/:chapterId/quiz/results',
          builder: (context, state) {
            final bookId = int.parse(state.pathParameters['bookId']!);
            final chapterId = int.parse(state.pathParameters['chapterId']!);
            final attemptId = int.parse(state.uri.queryParameters['attemptId']!);
            return QuizResultsPage(
              bookId: bookId,
              chapterId: chapterId,
              attemptId: attemptId,
            );
          },
        ),
        GoRoute(
          path: '/books/:bookId/chapters/:chapterId/mindmap',
          builder: (context, state) {
            final bookId = int.parse(state.pathParameters['bookId']!);
            final chapterId = int.parse(state.pathParameters['chapterId']!);
            return MindmapPage(bookId: bookId, chapterId: chapterId);
          },
        ),
      ],
    );

    return MaterialApp.router(
      title: 'Feng Shui Trainer',
      theme: AppTheme.lightTheme,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
