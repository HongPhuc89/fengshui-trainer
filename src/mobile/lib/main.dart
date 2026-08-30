import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'core/security/screen_guard.dart';

import 'core/utils/constants.dart';

import 'core/auth/auth_cubit.dart';
import 'core/di/injection.dart';
import 'core/router/app_router.dart';
import 'l10n/l10n.dart';
import 'shared/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Init Hive
  await Hive.initFlutter();

  // Fail loudly if the build carried no API_BASE_URL, rather than quietly
  // defaulting to the production host.
  AppConfig.assertConfigured();

  // Setup DI
  await configureDependencies();

  // Restore persisted auth session
  await getIt<AuthCubit>().restoreSession();

  // Prevent screenshots on both platforms
  await ScreenGuard.preventCapture();

  // Force portrait
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(const FengShuiApp());
}

class FengShuiApp extends StatefulWidget {
  const FengShuiApp({super.key});

  @override
  State<FengShuiApp> createState() => _FengShuiAppState();
}

class _FengShuiAppState extends State<FengShuiApp> with WidgetsBindingObserver {
  late final _router = buildAppRouter();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Blur sensitive content when app goes to background (DRM)
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused) {
      ScreenGuard.preventCapture();
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: getIt<AuthCubit>(),
      child: MaterialApp.router(
        title: 'Huyền Học',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.dark,
        routerConfig: _router,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
      ),
    );
  }
}
