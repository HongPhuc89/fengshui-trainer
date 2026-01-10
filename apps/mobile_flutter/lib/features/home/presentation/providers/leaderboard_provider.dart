import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/models/leaderboard_model.dart';
import '../../data/repositories/leaderboard_repository.dart';

final leaderboardRepositoryProvider = Provider<LeaderboardRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return LeaderboardRepository(apiClient);
});

final leaderboardProvider = FutureProvider<List<LeaderboardEntry>>((ref) async {
  final repository = ref.watch(leaderboardRepositoryProvider);
  return repository.getLeaderboard();
});
