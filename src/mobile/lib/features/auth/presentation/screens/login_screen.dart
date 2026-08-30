import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/device/device_service.dart';
import '../../../../core/di/injection.dart';
import '../../../../l10n/l10n.dart';
import '../../../../shared/theme/app_colors.dart';
import '../../../../shared/widgets/app_logo.dart';
import '../bloc/auth_bloc.dart';
import '../widgets/pairing_code_field.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _pairingCodeController = TextEditingController();

  /// Offer the pairing-code field straight away on a handset that has never
  /// completed a login, so the first attempt can already carry the code instead
  /// of costing the user a round trip.
  bool _offerPairingField = false;

  @override
  void initState() {
    super.initState();
    getIt<DeviceService>().hasPairedBefore().then((paired) {
      if (mounted) setState(() => _offerPairingField = !paired);
    });
  }
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _pairingCodeController.dispose();
    super.dispose();
  }

  void _onSubmit(BuildContext context) {
    if (!_formKey.currentState!.validate()) return;
    final code = _pairingCodeController.text.trim();
    context.read<AuthBloc>().add(LoginSubmitted(
          email: _emailController.text.trim(),
          password: _passwordController.text,
          // Empty on the first attempt: the app cannot know whether this handset
          // is already paired, so the server is what asks for a code.
          pairingCode: code.isEmpty ? null : code,
        ));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return BlocProvider(
      create: (_) => getIt<AuthBloc>(),
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: BlocListener<AuthBloc, AuthBlocState>(
          listener: (context, state) {
            if (state is AuthBlocSuccess) {
              context.go('/');
            } else if (state is AuthBlocError) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message),
                  backgroundColor: AppColors.error,
                ),
              );
            }
          },
          child: SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Container(
                  // Web: auth-layout__card — bg-card, radius-lg, padding-xl, shadow
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x4D000000),
                        blurRadius: 32,
                        offset: Offset(0, 8),
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Logo — web AppLogo login variant
                      const AppLogo(variant: AppLogoVariant.login),
                      const SizedBox(height: 24),

                      // Heading
                      Text(
                        l10n.loginHeading,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 17.6, // web 1.1rem
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Form
                      Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _AuthField(
                              controller: _emailController,
                              label: l10n.loginEmailLabel,
                              placeholder: l10n.loginEmailPlaceholder,
                              icon: Icons.person_outline,
                              keyboardType: TextInputType.emailAddress,
                              validator: (v) {
                                if (v == null || v.trim().isEmpty) return l10n.loginEmailRequired;
                                if (!v.contains('@')) return l10n.loginEmailInvalid;
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            _AuthField(
                              controller: _passwordController,
                              label: l10n.loginPasswordLabel,
                              placeholder: l10n.loginPasswordPlaceholder,
                              icon: Icons.lock_outline,
                              obscureText: _obscurePassword,
                              onToggleObscure: () => setState(() => _obscurePassword = !_obscurePassword),
                              validator: (v) {
                                if (v == null || v.isEmpty) return l10n.loginPasswordRequired;
                                return null;
                              },
                            ),

                            // Forgot password — web: right-aligned gold link
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: () {},
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 4),
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: Text(
                                  l10n.loginForgotPassword,
                                  style: const TextStyle(
                                    color: AppColors.primaryGold,
                                    fontSize: 13.6, // web 0.85rem
                                  ),
                                ),
                              ),
                            ),
                            // Pairing block — only after the server asks for a
                            // code, so a paired handset never sees it.
                            BlocBuilder<AuthBloc, AuthBlocState>(
                              builder: (context, state) {
                                final asked = state is AuthBlocPairingRequired;
                                if (!asked && !_offerPairingField) {
                                  return const SizedBox.shrink();
                                }
                                // Before the server has spoken, assume a code is
                                // expected: this handset has never been bound.
                                return PairingCodeField(
                                  controller: _pairingCodeController,
                                  hasUnclaimedSlot:
                                      asked ? state.hasUnclaimedSlot : true,
                                  enabled: true,
                                  errorText: asked ? state.errorMessage : null,
                                  supportEmail: asked ? state.supportEmail : null,
                                );
                              },
                            ),
                            const SizedBox(height: 16),

                            // Primary button — web: blue bg, uppercase, bold, arrow icon
                            BlocBuilder<AuthBloc, AuthBlocState>(
                              builder: (context, state) {
                                return _PrimaryButton(
                                  loading: state is AuthBlocLoading,
                                  onPressed: () => _onSubmit(context),
                                  label: l10n.loginSubmit,
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                      // No policy box and no sign-up link. The old copy promised
                      // "tối đa 3 thiết bị", which the slot model no longer means;
                      // and an account is useless on mobile until staff allocate a
                      // slot, so registration stays on the web.
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Matches web FormInput.vue — label above, icon left, dark bg-input fill
class _AuthField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String placeholder;
  final IconData icon;
  final TextInputType keyboardType;
  final bool obscureText;
  final VoidCallback? onToggleObscure;
  final String? Function(String?)? validator;

  const _AuthField({
    required this.controller,
    required this.label,
    required this.placeholder,
    required this.icon,
    this.keyboardType = TextInputType.text,
    this.obscureText = false,
    this.onToggleObscure,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13.6, // web 0.85rem
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          obscureText: obscureText,
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
          decoration: InputDecoration(
            hintText: placeholder,
            hintStyle: const TextStyle(color: AppColors.textMuted),
            fillColor: AppColors.surfaceAlt, // web: --bg-input
            prefixIcon: Icon(icon, color: AppColors.textMuted, size: 20),
            suffixIcon: onToggleObscure != null
                ? IconButton(
                    icon: Icon(
                      obscureText ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                      color: AppColors.textMuted,
                      size: 20,
                    ),
                    onPressed: onToggleObscure,
                  )
                : null,
            contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
          ),
          validator: validator,
        ),
      ],
    );
  }
}

/// Matches web PrimaryButton.vue — blue bg, uppercase, bold, arrow icon on right
class _PrimaryButton extends StatelessWidget {
  final bool loading;
  final VoidCallback? onPressed;
  final String label;

  const _PrimaryButton({
    required this.loading,
    required this.onPressed,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: loading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryBlue, // web: --btn-primary #1481b8
          foregroundColor: AppColors.textPrimary,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        child: loading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white70),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    label.toUpperCase(),
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.05 * 14,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.arrow_forward, size: 20),
                ],
              ),
      ),
    );
  }
}

/// Matches web PolicyBox.vue — dark red bg, shield icon, policy text
