import 'package:equatable/equatable.dart';

class DeviceStatus extends Equatable {
  final String deviceName;

  /// Short support code (MC-7F3A2B91) the user reads out to an administrator
  /// when asking to move the account to another handset.
  final String? clientCode;
  final DateTime? boundAt;

  const DeviceStatus({
    required this.deviceName,
    this.clientCode,
    this.boundAt,
  });

  @override
  List<Object?> get props => [deviceName, clientCode, boundAt];
}
