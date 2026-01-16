import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../network/api_client.dart';
import '../storage/secure_storage.dart';

/// Service to handle user experience/XP and daily check-in
class ExperienceService {
  static final ExperienceService _instance = ExperienceService._internal();
  factory ExperienceService() => _instance;
  ExperienceService._internal();

  final ApiClient _apiClient = ApiClient(SecureStorage());
  static const String _lastCheckInKey = 'last_daily_checkin_date';

  /// Check if user has already checked in today (locally)
  Future<bool> _hasCheckedInToday(int userId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastCheckIn = prefs.getString('${_lastCheckInKey}_$userId');
      
      if (lastCheckIn == null) return false;
      
      final lastDate = DateTime.parse(lastCheckIn);
      final today = DateTime.now();
      
      // Check if last check-in was today
      return lastDate.year == today.year &&
             lastDate.month == today.month &&
             lastDate.day == today.day;
    } catch (e) {
      return false;
    }
  }

  /// Save check-in date locally
  Future<void> _saveCheckInDate(int userId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('${_lastCheckInKey}_$userId', DateTime.now().toIso8601String());
    } catch (e) {
      if (kDebugMode) {
        print('⚠️ [Experience] Failed to save check-in date: $e');
      }
    }
  }

  /// Perform daily check-in (awards 5 XP once per day)
  /// Returns true if check-in was successful, false if already checked in today
  Future<bool> dailyCheckIn(int userId) async {
    try {
      // Check local cache first to avoid unnecessary API calls
      if (await _hasCheckedInToday(userId)) {
        if (kDebugMode) {
          print('ℹ️ [Experience] Already checked in today (cached)');
        }
        return false;
      }

      if (kDebugMode) {
        print('📅 [Experience] Attempting daily check-in for user $userId');
      }

      final response = await _apiClient.get<Map<String, dynamic>>('/experience/users/$userId/daily-checkin');
      
      final success = response['success'] == true;
      
      if (kDebugMode) {
        if (success) {
          print('✅ [Experience] Daily check-in successful! +5 XP');
        } else {
          print('ℹ️ [Experience] Already checked in today (server)');
        }
      }

      // Save to local cache if successful
      if (success) {
        await _saveCheckInDate(userId);
      }

      return success;
    } on DioException catch (e) {
      if (kDebugMode) {
        print('❌ [Experience] Daily check-in failed: ${e.message}');
      }
      return false;
    } catch (e) {
      if (kDebugMode) {
        print('❌ [Experience] Daily check-in error: $e');
      }
      return false;
    }
  }

  /// Get user's XP summary
  Future<Map<String, dynamic>?> getUserExperience(int userId) async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>('/experience/users/$userId');
      return response;
    } catch (e) {
      if (kDebugMode) {
        print('❌ [Experience] Failed to get user experience: $e');
      }
      return null;
    }
  }
}

