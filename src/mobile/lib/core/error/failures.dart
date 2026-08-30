import 'package:equatable/equatable.dart';

abstract class Failure extends Equatable {
  final String message;
  const Failure(this.message);

  @override
  List<Object> get props => [message];
}

class ServerFailure extends Failure {
  const ServerFailure(super.message);
}

class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'Không có kết nối mạng']);
}

class UnauthorizedFailure extends Failure {
  const UnauthorizedFailure([super.message = 'Phiên đăng nhập đã hết hạn']);
}

class ForbiddenFailure extends Failure {
  const ForbiddenFailure([super.message = 'Bạn không có quyền truy cập']);
}

class NotFoundFailure extends Failure {
  const NotFoundFailure([super.message = 'Không tìm thấy nội dung']);
}

class DeviceLockedFailure extends Failure {
  final String? boundDeviceName;
  final DateTime? nextResetAvailable;

  const DeviceLockedFailure({
    String message = 'Tài khoản đã được liên kết với thiết bị khác',
    this.boundDeviceName,
    this.nextResetAvailable,
  }) : super(message);

  @override
  List<Object> get props =>
      [message, boundDeviceName ?? '', nextResetAvailable ?? ''];
}

/// This handset needs a pairing code from an administrator.
class PairingRequiredFailure extends Failure {
  final bool hasUnclaimedSlot;
  final String? supportEmail;

  const PairingRequiredFailure({
    String message = 'Thiết bị này chưa được ghép cặp',
    this.hasUnclaimedSlot = false,
    this.supportEmail,
  }) : super(message);

  @override
  List<Object> get props => [message, hasUnclaimedSlot, supportEmail ?? ''];
}


class PdfGeneratingFailure extends Failure {
  const PdfGeneratingFailure(
      [super.message = 'PDF đang được chuẩn bị, vui lòng thử lại sau ít phút']);
}

class CacheFailure extends Failure {
  const CacheFailure(super.message);
}
