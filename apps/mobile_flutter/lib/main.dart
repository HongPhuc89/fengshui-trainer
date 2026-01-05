import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/config/theme.dart';
import 'features/auth/presentation/pages/login_page.dart';
import 'features/auth/presentation/pages/register_page.dart';
import 'features/auth/presentation/providers/auth_provider.dart';
import 'features/books/presentation/pages/books_list_page.dart';
import 'features/books/presentation/pages/book_detail_page.dart';
import 'features/chapters/presentation/pages/chapter_detail_page.dart';
import 'features/flashcards/presentation/pages/flashcards_page.dart';
import 'features/quiz/presentation/pages/quiz_page.dart';
import 'features/quiz/presentation/pages/quiz_results_page.dart';
import 'features/mindmap/presentation/pages/mindmap_page.dart';

void main() {
  runApp(const ProviderScope(child: MyApp()));
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = GoRouter(
      initialLocation: '/login',
      redirect: (context, state) {
        final authState = ref.read(authProvider);
        final isAuthenticated = authState.isAuthenticated;
        final isGoingToLogin = state.matchedLocation == '/login';
        final isGoingToRegister = state.matchedLocation == '/register';

        if (!isAuthenticated && !isGoingToLogin && !isGoingToRegister) {
          return '/login';
        }

        if (isAuthenticated && (isGoingToLogin || isGoingToRegister)) {
          return '/home';
        }

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
          path: '/books/:bookId',
          builder: (context, state) {
            final bookId = int.parse(state.pathParameters['bookId']!);
            return BookDetailPage(bookId: bookId);
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
      title: 'Fengshui Trainer',
      theme: AppTheme.lightTheme,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}


// Temporary Home Page
class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) {
                context.go('/login');
              }
            },
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.check_circle,
              size: 80,
              color: Colors.green,
            ),
            const SizedBox(height: 24),
            const Text(
              'Đăng nhập thành công!',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            if (user != null) ...[
              Text(
                'Xin chào, ${user.name}!',
                style: const TextStyle(fontSize: 18),
              ),
              const SizedBox(height: 8),
              Text(
                'Email: ${user.email}',
                style: const TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 8),
              Text(
                'Level: ${user.level} | XP: ${user.experience}',
                style: const TextStyle(color: Colors.grey),
              ),
            ],
            const SizedBox(height: 32),
            const Text(
              '🎉 Flutter App is working!',
              style: TextStyle(fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }
}
