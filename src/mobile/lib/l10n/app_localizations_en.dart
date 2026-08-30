// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'HUYỀN HỌC';

  @override
  String get appSubtitle => 'ANCIENT WISDOM ARCHIVES';

  @override
  String get appHeaderSubtitle => 'HUYENHOC CULTIVATION SYSTEM';

  @override
  String get loginHeading => 'Access the Archives';

  @override
  String get loginEmailLabel => 'Email Address';

  @override
  String get loginEmailPlaceholder => 'Enter your email address';

  @override
  String get loginPasswordLabel => 'Password';

  @override
  String get loginPasswordPlaceholder => 'Enter your secure key';

  @override
  String get loginForgotPassword => 'Forgot Password?';

  @override
  String get loginSubmit => 'Enter Library';

  @override
  String get loginNoAccount => 'New Scholar?';

  @override
  String get loginRegisterLink => 'Register for Access';

  @override
  String get loginEmailRequired => 'Please enter your email';

  @override
  String get loginEmailInvalid => 'Invalid email format';

  @override
  String get loginPasswordRequired => 'Please enter your password';

  @override
  String get loginPolicyTitle => 'Security Policy';

  @override
  String get loginPolicyBody =>
      'For security, each login will automatically sign out other active sessions. Up to 3 devices are supported per account.';

  @override
  String get registerTitle => 'Register';

  @override
  String get registerSubtitle => 'SCHOLAR REGISTRATION';

  @override
  String get registerEmailLabel => 'Email Address';

  @override
  String get registerPasswordLabel => 'Password';

  @override
  String get registerPasswordMin => 'Password must be at least 8 characters';

  @override
  String get registerConfirmLabel => 'Confirm Password';

  @override
  String get registerPasswordMismatch => 'Passwords do not match';

  @override
  String get registerTermsLabel =>
      'I agree to the Terms of Service and Privacy Policy';

  @override
  String get registerTermsRequired => 'Please accept the terms of service';

  @override
  String get registerSubmit => 'Create Account';

  @override
  String get registerAlreadyAccount => 'Already a scholar?';

  @override
  String get registerLoginLink => 'Log In';

  @override
  String get registerError => 'Registration failed. Please try again.';

  @override
  String get deviceLockTitle => 'Device Locked';

  @override
  String get deviceLockHeading => 'Account linked to another device';

  @override
  String get deviceLockBoundDeviceLabel => 'Currently linked device';

  @override
  String get deviceLockNextAvailableLabel => 'Can switch device after';

  @override
  String get deviceLockRequestReset => 'Switch to This Device';

  @override
  String get deviceLockResetSuccess => 'Device unlinked. Please log in again.';

  @override
  String get deviceLockBack => 'Back to Login';

  @override
  String get navHome => 'Home';

  @override
  String get navBooks => 'Library';

  @override
  String get navStore => 'Treasure';

  @override
  String get navVideos => 'Videos';

  @override
  String get navProfile => 'Profile';

  @override
  String get homeGreetingMorning => 'Good morning';

  @override
  String get homeGreetingAfternoon => 'Good afternoon';

  @override
  String get homeGreetingEvening => 'Good evening';

  @override
  String get homeSectionReading => 'Continue Reading';

  @override
  String get homeSectionWatching => 'Continue Watching';

  @override
  String get homeSectionNewBooks => 'New Books';

  @override
  String get homeSectionNewVideos => 'New Videos';

  @override
  String get homeSeeAll => 'View All';

  @override
  String get commonLoading => 'Loading...';

  @override
  String get commonError => 'An error occurred. Please try again.';

  @override
  String get commonRetry => 'Retry';
}
