import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import '../../data/models/leaderboard_model.dart';
import '../providers/leaderboard_provider.dart';

class LeaderboardPage extends ConsumerWidget {
  const LeaderboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Log screen view to Firebase
    FirebaseAnalytics.instance.logScreenView(screenName: 'LeaderboardPage');

    final leaderboardState = ref.watch(leaderboardProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF1a1a2e),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFF1A1A2E),
              Color(0xFF16213E),
              Color(0xFF0F3460),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.symmetric(vertical: 24),
                decoration: const BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: Color(0xFFFFD700), width: 2),
                  ),
                ),
                child: const Center(
                  child: Text(
                    'BẢNG PHONG THẦN',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFFFD700),
                      letterSpacing: 2,
                    ),
                  ),
                ),
              ),
              // List
              Expanded(
                child: leaderboardState.when(
                  data: (entries) {
                    if (entries.isEmpty) {
                      return const Center(
                        child: Text(
                          'Chưa có dữ liệu xếp hạng',
                          style: TextStyle(color: Colors.white60, fontSize: 16),
                        ),
                      );
                    }
                    return RefreshIndicator(
                      onRefresh: () => ref.refresh(leaderboardProvider.future),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: entries.length,
                        itemBuilder: (context, index) {
                          final entry = entries[index];
                          return _LeaderboardEntryTile(entry: entry);
                        },
                      ),
                    );
                  },
                  loading: () => const Center(
                    child: CircularProgressIndicator(color: Color(0xFFFFD700)),
                  ),
                  error: (error, _) => Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'Không thể tải bảng xếp hạng',
                          style: TextStyle(color: Color(0xFFFF6B6B)),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => ref.refresh(leaderboardProvider),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2D7061),
                          ),
                          child: const Text('Thử lại'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LeaderboardEntryTile extends StatelessWidget {
  final LeaderboardEntry entry;

  const _LeaderboardEntryTile({required this.entry});

  String? _getMedalIcon(int rank) {
    if (rank == 1) return '🥇';
    if (rank == 2) return '🥈';
    if (rank == 3) return '🥉';
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final medal = _getMedalIcon(entry.rank);
    final bool isTopThree = entry.rank <= 3;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isTopThree 
            ? const Color(0xFFFFD700).withOpacity(0.1) 
            : Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isTopThree 
              ? const Color(0xFFFFD700).withOpacity(0.3) 
              : Colors.white.withOpacity(0.1),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          // Rank
          SizedBox(
            width: 40,
            child: Center(
              child: medal != null
                  ? Text(medal, style: const TextStyle(fontSize: 28))
                  : Text(
                      '${entry.rank}',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white60,
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 8),
          // Avatar
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: isTopThree
                    ? [const Color(0xFFFFD700), const Color(0xFFFFA500)]
                    : [const Color(0xFF4A5568), const Color(0xFF2D3748)],
              ),
            ),
            child: Center(
              child: Text(
                entry.fullName.isNotEmpty ? entry.fullName[0].toUpperCase() : '?',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          // User Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.fullName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Color(int.parse(entry.level.color.replaceFirst('#', '0xFF'))),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    entry.level.title,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
          // XP
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Text(
                'TU VI',
                style: TextStyle(
                  fontSize: 10,
                  color: Colors.white54,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '${entry.experiencePoints}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF00FF9F),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
