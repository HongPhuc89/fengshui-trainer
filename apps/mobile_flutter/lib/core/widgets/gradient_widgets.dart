import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Gradient background widget matching React Native design
class GradientBackground extends StatelessWidget {
  final Widget child;
  final String variant;

  const GradientBackground({
    Key? key,
    required this.child,
    this.variant = 'redGold',
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: _getGradient(),
      ),
      child: child,
    );
  }

  LinearGradient _getGradient() {
    switch (variant) {
      case 'lucky':
        return const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primaryRed,
            AppColors.primaryRedDark,
          ],
        );
      case 'gold':
        return const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.secondaryGold,
            Color(0xFFFFA500), // Orange
          ],
        );
      case 'jade':
        return const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.accentJade,
            Color(0xFF006B4E), // Dark jade
          ],
        );
      case 'redGold':
      default:
        return const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primaryRed,
            AppColors.secondaryGold,
          ],
        );
    }
  }
}

/// Gradient button widget
class GradientButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool loading;
  final bool fullWidth;
  final EdgeInsetsGeometry? padding;

  const GradientButton({
    Key? key,
    required this.text,
    this.onPressed,
    this.loading = false,
    this.fullWidth = false,
    this.padding,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    Widget button = Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [
            AppColors.primaryRed,
            AppColors.secondaryGold,
          ],
        ),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryRed.withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ElevatedButton(
        onPressed: loading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          padding: padding ??
              const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: loading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(AppColors.white),
                ),
              )
            : Text(
                text,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.white,
                ),
              ),
      ),
    );

    if (fullWidth) {
      return SizedBox(
        width: double.infinity,
        child: button,
      );
    }

    return button;
  }
}
