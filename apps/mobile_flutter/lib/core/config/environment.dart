class Environment {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://book-api.hongphuc.top/api/',
  );

  static const String appName = 'Fengshui Trainer';
  static const String appVersion = '1.0.0';

  static bool get isProduction => const bool.fromEnvironment('dart.vm.product');
  static bool get isDevelopment => !isProduction;
}
