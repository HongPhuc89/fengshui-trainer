import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../models/leaderboard_model.dart';

class LeaderboardRepository {
  final ApiClient _apiClient;

  LeaderboardRepository(this._apiClient);

  Future<List<LeaderboardEntry>> getLeaderboard() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.leaderboard);
      
      if (response is Map<String, dynamic> && response.containsKey('data')) {
        final List<dynamic> data = response['data'] as List<dynamic>;
        return data.map((json) => LeaderboardEntry.fromJson(json as Map<String, dynamic>)).toList();
      }
      
      return [];
    } catch (e) {
      rethrow;
    }
  }
}
