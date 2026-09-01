class ServerException implements Exception {
  final String message;
  final int? statusCode;
  const ServerException(this.message, {this.statusCode});
}

class DeviceLockedException implements Exception {
  final String? boundDeviceName;
  final DateTime? nextResetAvailable;
  const DeviceLockedException({this.boundDeviceName, this.nextResetAvailable});
}

/// This handset has not been paired yet. Pairing needs a code an administrator
/// issues out of band — there is no self-service path.
class PairingRequiredException implements Exception {
  /// True when a slot is already waiting, so the app can open the code field
  /// instead of sending the user off to ask for one.
  final bool hasUnclaimedSlot;
  final String? supportEmail;
  const PairingRequiredException({
    this.hasUnclaimedSlot = false,
    this.supportEmail,
  });
}

/// The pairing code was wrong, expired, or already spent. [message] carries the
/// server's Vietnamese explanation, including attempts remaining.
class PairingFailedException implements Exception {
  final String message;
  const PairingFailedException(this.message);
}

class PdfGeneratingException implements Exception {
  const PdfGeneratingException();
}

class CacheException implements Exception {
  final String message;
  const CacheException(this.message);
}
