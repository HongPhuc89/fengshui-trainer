import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';

import 'analytics_service.dart';

/// Service to track screen views using GoRouter's navigation events
/// This is the Flutter equivalent of React Native's usePathname/useSegments hooks
class RouterAnalyticsService {
  static final RouterAnalyticsService _instance = RouterAnalyticsService._internal();
  factory RouterAnalyticsService() => _instance;
  RouterAnalyticsService._internal();

  bool _isListening = false;

  /// Attach listener to GoRouter to track screen views
  void attachToRouter(GoRouter router) {
    if (_isListening) {
      if (kDebugMode) {
        print('⚠️ [RouterAnalytics] Already listening to router');
      }
      return;
    }

    _isListening = true;
    
    if (kDebugMode) {
      print('✅ [RouterAnalytics] Attaching to GoRouter...');
    }
    
    // Track the current route immediately
    _trackCurrentRoute(router);
    
    // Add listener for future route changes
    router.routerDelegate.addListener(() {
      if (kDebugMode) {
        print('🔔 [RouterAnalytics] Route changed, tracking...');
      }
      _trackCurrentRoute(router);
    });

    if (kDebugMode) {
      print('✅ [RouterAnalytics] Successfully attached to GoRouter');
    }
  }

  /// Track the current route
  void _trackCurrentRoute(GoRouter router) {
    try {
      final location = router.routerDelegate.currentConfiguration;
      
      if (kDebugMode) {
        print('🔍 [RouterAnalytics] Checking route...');
      }
      
      if (location.isEmpty) {
        if (kDebugMode) {
          print('⚠️ [RouterAnalytics] Location is empty, skipping');
        }
        return;
      }

      final routeMatch = location.last;
      final routePath = routeMatch.matchedLocation;
      
      // Extract route name from the matched route
      final routeName = (routeMatch.route as GoRoute).name;
      
      // Use route name if available, otherwise use path
      final displayName = routeName ?? routePath;
      
      if (displayName.isEmpty) {
        if (kDebugMode) {
          print('⚠️ [RouterAnalytics] Display name is empty, skipping');
        }
        return;
      }

      // Extract clean screen name
      final screenName = _extractScreenName(displayName);
      
      if (kDebugMode) {
        print('📊 [RouterAnalytics] Screen view tracked:');
        print('   - Screen name: $screenName');
        print('   - Route name: $routeName');
        print('   - Route path: $routePath');
      }
      
      // Log to analytics
      AnalyticsService().logEvent('screen_view', {
        'screen_name': screenName,
        'route_name': routeName ?? routePath,
        'route_path': routePath,
      });
      
      if (kDebugMode) {
        print('✅ [RouterAnalytics] Event sent to AnalyticsService');
      }
    } catch (e, stackTrace) {
      if (kDebugMode) {
        print('❌ [RouterAnalytics] Error tracking route: $e');
        print('   Stack trace: $stackTrace');
      }
    }
  }

  /// Convert route names to readable screen names
  /// Examples:
  /// - 'login' -> 'Login'
  /// - 'books_list' -> 'Books List'
  /// - '/books' -> 'Books'
  String _extractScreenName(String routeName) {
    final cleanName = routeName.replaceAll('/', '').replaceAll('-', '_');
    return cleanName
        .split('_')
        .map((word) => word.isNotEmpty ? word[0].toUpperCase() + word.substring(1) : '')
        .join(' ');
  }

  /// Reset the service (useful for testing)
  void reset() {
    _isListening = false;
  }
}
