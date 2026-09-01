import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'core/security/screen_guard.dart';

import 'core/utils/constants.dart';

import 'core/auth/auth_cubit.dart';
import 'core/di/injection.dart';
import 'core/router/app_router.dart';
import 'features/update/presentation/update_cubit.dart';
import 'features/update/presentation/update_gate.dart';
import 'l10n/l10n.dart';
import 'shared/theme/app_theme.dart';

void main() async {
  await SentryFlutter.init(
    (options) {
      // Empty DSN disables the SDK without erroring — local dev builds leave
      // SENTRY_DSN unset so crashes on a developer's machine are never
      // reported as if they came from a real environment.
      options.dsn = AppConfig.sentryDsn;
      options.sendDefaultPii = true;
      options.tracesSampleRate = 1.0;
    },
    appRunner: _runApp,
  );
}

Future<void> _runApp() async {
  WidgetsFlutterBinding.ensureInitialized();

  // DateFormat with an explicit locale throws unless its symbols are loaded;
  // the store screen formats dates in Vietnamese.
  await initializeDateFormatting('vi_VN');

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

  // Deliberately not awaited: a slow network must not hold the app on a blank
  // screen. The result arrives through UpdateGate when it arrives (§7.5).
  unawaited(getIt<UpdateCubit>().check());

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
    if (state == AppLifecycleState.resumed) {
      // force: false leaves the 6-hour throttle in charge, so switching apps
      // does not turn into a request each time (§7.5).
      unawaited(getIt<UpdateCubit>().check(force: false));
    }
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider.value(value: getIt<AuthCubit>()),
        BlocProvider.value(value: getIt<UpdateCubit>()),
      ],
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
        builder: (context, child) => UpdateGate(child: child ?? const SizedBox()),
      ),
    );
  }
}
