import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../theme/app_colors.dart';
import '../../l10n/l10n.dart';

enum AppLogoVariant { login, register, app }

/// Replicates web AppLogo.vue exactly.
/// - login: 80px icon + "HUYỀN HỌC" + "ANCIENT WISDOM ARCHIVES" (column)
/// - register: 80px icon + "HUYỀN HỌC" + "ĐĂNG KÝ HỌC GIẢ" in golden (column)
/// - app: 28px icon + "HUYỀN HỌC" side by side (row, used in app bar)
class AppLogo extends StatelessWidget {
  final AppLogoVariant variant;

  const AppLogo({super.key, this.variant = AppLogoVariant.login});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    if (variant == AppLogoVariant.app) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SvgPicture.asset('assets/images/logo.svg', width: 28, height: 28),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                l10n.appName,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primaryGold,
                  letterSpacing: 0.8,
                ),
              ),
              Text(
                l10n.appHeaderSubtitle,
                style: const TextStyle(
                  fontSize: 9,
                  letterSpacing: 1.2,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ],
      );
    }

    // login / register — column layout matching web
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SvgPicture.asset('assets/images/logo.svg', width: 80, height: 80),
        const SizedBox(height: 12),
        Text(
          l10n.appName,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w700,
            color: AppColors.primaryGold,
            letterSpacing: 1.4, // 0.05em × 28px
          ),
        ),
        const SizedBox(height: 4),
        if (variant == AppLogoVariant.login)
          Text(
            l10n.appSubtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 11,
              letterSpacing: 1.1, // 0.1em × 11px
              color: AppColors.textSecondary,
            ),
          )
        else // register
          Text(
            l10n.registerSubtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 11,
              letterSpacing: 1.1,
              color: AppColors.accentGolden,
            ),
          ),
      ],
    );
  }
}
