import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class MainScreen extends StatelessWidget {
  const MainScreen({
    required this.navigationShell,
    super.key,
  });

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1a1a2e),
      body: navigationShell,
      bottomNavigationBar: _buildBottomBar(context),
    );
  }

  Widget _buildBottomBar(BuildContext context) {
    return Container(
      height: 70,
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      decoration: BoxDecoration(
        color: const Color(0xFF1F2937),
        borderRadius: BorderRadius.circular(35),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _NavBarItem(
            icon: Icons.home,
            outlineIcon: Icons.home_outlined,
            isActive: navigationShell.currentIndex == 0,
            onTap: () => _onTap(context, 0),
          ),
          _NavBarItem(
            icon: Icons.library_books,
            outlineIcon: Icons.library_books_outlined,
            isActive: navigationShell.currentIndex == 1,
            onTap: () => _onTap(context, 1),
          ),
          _NavBarItem(
            icon: Icons.person,
            outlineIcon: Icons.person_outline,
            isActive: navigationShell.currentIndex == 2,
            onTap: () => _onTap(context, 2),
          ),
        ],
      ),
    );
  }

  void _onTap(BuildContext context, int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
    
    // Track tab navigation
    final tabNames = ['books', 'leaderboard', 'profile'];
    if (index >= 0 && index < tabNames.length) {
      // Import analytics service at the top of the file
      // This will be tracked by the observer, but we can add extra context
      print('📊 [MainScreen] Navigated to tab: ${tabNames[index]}');
    }
  }
}

class _NavBarItem extends StatelessWidget {
  const _NavBarItem({
    required this.icon,
    required this.outlineIcon,
    required this.isActive,
    required this.onTap,
  });

  final IconData icon;
  final IconData outlineIcon;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(35),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        child: Icon(
          isActive ? icon : outlineIcon,
          color: isActive ? const Color(0xFFF59E0B) : const Color(0xFF6B7280),
          size: 28,
        ),
      ),
    );
  }
}
