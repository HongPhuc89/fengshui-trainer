import 'package:equatable/equatable.dart';

class UserEntity extends Equatable {
  final String id;
  final String email;
  final String name;
  final String? phone;
  final String? avatarUrl;
  final String userType; // 'FREE' | 'VIP' | 'ADMIN'

  const UserEntity({
    required this.id,
    required this.email,
    required this.name,
    this.phone,
    this.avatarUrl,
    required this.userType,
  });

  bool get isVip => userType == 'VIP';
  bool get isAdmin => userType == 'ADMIN';

  @override
  List<Object?> get props => [id, email, name, phone, avatarUrl, userType];
}
