import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_cubit.dart';
import '../../l10n/l10n.dart';
import '../theme/app_colors.dart';

class AppShell extends StatelessWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: const AppBottomNav(),
    );
  }
}

class AppBottomNav extends StatelessWidget {
  const AppBottomNav({super.key});

  static const _allPaths = ['/', '/books', '/store', '/videos', '/profile'];
  static const _allIcons = [
    Icons.home_outlined,
    Icons.menu_book_outlined,
    Icons.diamond_outlined,
    Icons.play_circle_outline,
    Icons.person_outline,
  ];
  static const _allActiveIcons = [
    Icons.home,
    Icons.menu_book,
    Icons.diamond,
    Icons.play_circle,
    Icons.person,
  ];

  // VIP members already have full access, so the "contribute to unlock more"
  // store tab has nothing left to offer them. Mobile-only — the web nav still
  // shows Store to every user regardless of VIP status.
  static const _storeIndex = 2;

  int _currentIndex(List<String> paths, BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    for (var i = 0; i < paths.length; i++) {
      if (location == paths[i]) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final isVip = context.watch<AuthCubit>().currentUser?.isVip ?? false;

    final allLabels = [
      l10n.navHome,
      l10n.navBooks,
      l10n.navStore,
      l10n.navVideos,
      l10n.navProfile,
    ];

    final indices = [
      for (var i = 0; i < _allPaths.length; i++)
        if (i != _storeIndex || !isVip) i
    ];
    final paths = [for (final i in indices) _allPaths[i]];
    final labels = [for (final i in indices) allLabels[i]];
    final icons = [for (final i in indices) _allIcons[i]];
    final activeIcons = [for (final i in indices) _allActiveIcons[i]];

    final current = _currentIndex(paths, context);

    return NavigationBar(
      selectedIndex: current,
      onDestinationSelected: (i) => context.go(paths[i]),
      destinations: List.generate(paths.length, (i) {
        final isSelected = i == current;
        return NavigationDestination(
          icon: Icon(icons[i],
              color: isSelected ? AppColors.primaryGold : AppColors.textMuted),
          selectedIcon: Icon(activeIcons[i], color: AppColors.primaryGold),
          label: labels[i],
        );
      }),
    );
  }
}
