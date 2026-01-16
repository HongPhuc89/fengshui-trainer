import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'action_button.dart';

class BottomMenuBar extends StatelessWidget {
  const BottomMenuBar({
    required this.bookId,
    required this.chapterId,
    super.key,
  });

  final int bookId;
  final int chapterId;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF6B7280).withOpacity(0.95),
            const Color(0xFF4B5563).withOpacity(0.98),
          ],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(24),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            offset: const Offset(0, -4),
            blurRadius: 8,
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'CHỌN HÌNH THỨC TU LUYỆN',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFFD1D5DB),
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Expanded(
                    child: ActionButton(
                      label: 'Đọc Sách',
                      icon: Icons.menu_book,
                      gradient: const [
                        Color(0xFF3B82F6),
                        Color(0xFF1D4ED8),
                      ],
                      onTap: () {
                        // Navigate to PDF reading page
                        context.go('/books/$bookId/chapters/$chapterId/read');
                      },
                    ),
                  ),
                  Expanded(
                    child: ActionButton(
                      label: 'Thẻ Nhớ',
                      icon: Icons.book,
                      gradient: const [
                        Color(0xFF8B5CF6),
                        Color(0xFF6D28D9),
                      ],
                      onTap: () => context.go(
                        '/books/$bookId/chapters/$chapterId/flashcards',
                      ),
                    ),
                  ),
                  Expanded(
                    child: ActionButton(
                      label: 'Đồ Họa',
                      icon: Icons.auto_awesome_mosaic,
                      gradient: const [
                        Color(0xFF10B981),
                        Color(0xFF059669),
                      ],
                      onTap: () => context.go(
                        '/books/$bookId/chapters/$chapterId/infographic',
                      ),
                    ),
                  ),
                  Expanded(
                    child: ActionButton(
                      label: 'Thử Thách',
                      icon: Icons.flash_on,
                      gradient: const [
                        Color(0xFFEF4444),
                        Color(0xFFDC2626),
                      ],
                      onTap: () => context.go(
                        '/books/$bookId/chapters/$chapterId/quiz',
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
