import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

import 'analytics_service.dart';

/// Custom navigator observer that tracks screen views in Amplitude
class AmplitudeObserver extends NavigatorObserver {
  final AnalyticsService _analytics = AnalyticsService();

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    _logScreenView(route);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPop(route, previousRoute);
    if (previousRoute != null) {
      _logScreenView(previousRoute);
    }
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    if (newRoute != null) {
      _logScreenView(newRoute);
    }
  }

  void _logScreenView(Route<dynamic> route) {
    final screenName = route.settings.name;
    if (screenName != null && screenName.isNotEmpty) {
      _analytics.logEvent('screen_view', {
        'screen_name': screenName,
        'screen_class': route.runtimeType.toString(),
      });

      if (kDebugMode) {
        print('📊 [AmplitudeObserver] Screen view: $screenName');
      }
    }
  }
}
