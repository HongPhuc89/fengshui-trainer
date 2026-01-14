import 'package:flutter_dotenv/flutter_dotenv.dart';

class Environment {
  static String get apiBaseUrl => dotenv.get(
        'API_BASE_URL',
        fallback: 'https://book-api.hongphuc.top/api/',
      );

  static String get amplitudeApiKey => dotenv.get(
        'AMPLITUDE_API_KEY',
        fallback: '',
      );

  static const String appName = 'Fengshui Trainer';
  static const String appVersion = '1.0.0';

  static String get env => dotenv.get('ENV', fallback: 'development');
  static bool get isProduction => env == 'production';
  static bool get isDevelopment => !isProduction;
}
