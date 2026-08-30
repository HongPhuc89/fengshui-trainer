import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

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

  static const _paths = ['/', '/books', '/store', '/videos', '/profile'];
  static const _icons = [
    Icons.home_outlined,
    Icons.menu_book_outlined,
    Icons.diamond_outlined,
    Icons.play_circle_outline,
    Icons.person_outline,
  ];
  static const _activeIcons = [
    Icons.home,
    Icons.menu_book,
    Icons.diamond,
    Icons.play_circle,
    Icons.person,
  ];

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    for (var i = 0; i < _paths.length; i++) {
      if (location == _paths[i]) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final labels = [
      l10n.navHome,
      l10n.navBooks,
      l10n.navStore,
      l10n.navVideos,
      l10n.navProfile,
    ];
    final current = _currentIndex(context);

    return NavigationBar(
      selectedIndex: current,
      onDestinationSelected: (i) => context.go(_paths[i]),
      destinations: List.generate(_paths.length, (i) {
        final isSelected = i == current;
        return NavigationDestination(
          icon: Icon(_icons[i],
              color: isSelected ? AppColors.primaryGold : AppColors.textMuted),
          selectedIcon: Icon(_activeIcons[i], color: AppColors.primaryGold),
          label: labels[i],
        );
      }),
    );
  }
}
