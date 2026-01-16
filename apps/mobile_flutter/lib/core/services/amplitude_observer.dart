import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';

import 'analytics_service.dart';

/// Custom GoRouter listener that tracks screen views in Amplitude
class AmplitudeObserver extends NavigatorObserver {
  final AnalyticsService _analytics = AnalyticsService();

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    if (kDebugMode) {
      print('🔍 [AmplitudeObserver] didPush called');
      print('   - Route: ${route.settings.name ?? "unnamed"}');
      print('   - Route type: ${route.runtimeType}');
      print('   - Previous: ${previousRoute?.settings.name ?? "none"}');
    }
    _logScreenView(route);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPop(route, previousRoute);
    if (kDebugMode) {
      print('🔍 [AmplitudeObserver] didPop called');
      print('   - Route: ${route.settings.name ?? "unnamed"}');
      print('   - Previous: ${previousRoute?.settings.name ?? "none"}');
    }
    if (previousRoute != null) {
      _logScreenView(previousRoute);
    }
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    if (kDebugMode) {
      print('🔍 [AmplitudeObserver] didReplace called');
      print('   - New route: ${newRoute?.settings.name ?? "unnamed"}');
      print('   - Old route: ${oldRoute?.settings.name ?? "unnamed"}');
    }
    if (newRoute != null) {
      _logScreenView(newRoute);
    }
  }

  void _logScreenView(Route<dynamic> route) {
    // Get the route name from settings (GoRouter sets this)
    final routeName = route.settings.name;
    
    if (kDebugMode) {
      print('🔍 [AmplitudeObserver] _logScreenView called');
      print('   - Route name: ${routeName ?? "NULL"}');
      print('   - Route type: ${route.runtimeType}');
    }
    
    if (routeName != null && routeName.isNotEmpty) {
      // Extract clean screen name
      final screenName = _extractScreenName(routeName);
      
      if (kDebugMode) {
        print('📊 [AmplitudeObserver] Logging screen view:');
        print('   - Screen name: $screenName');
        print('   - Route name: $routeName');
      }
      
      _analytics.logEvent('screen_view', {
        'screen_name': screenName,
        'route_name': routeName,
        'screen_class': route.runtimeType.toString(),
      });

      if (kDebugMode) {
        print('✅ [AmplitudeObserver] Event logged successfully');
      }
    } else {
      // Fallback for routes without names
      if (kDebugMode) {
        print('⚠️ [AmplitudeObserver] Route without name: ${route.runtimeType}');
        print('   - Settings: ${route.settings}');
        print('   - Arguments: ${route.settings.arguments}');
      }
    }
  }

  String _extractScreenName(String routeName) {
    // GoRouter route names are like: 'login', 'books_list', 'book_detail', etc.
    // Convert to readable format: 'Login', 'Books List', 'Book Detail'
    return routeName
        .split('_')
        .map((word) => word[0].toUpperCase() + word.substring(1))
        .join(' ');
  }
}
