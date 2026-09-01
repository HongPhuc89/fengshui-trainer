import '../../domain/entities/user.dart';

class UserModel extends UserEntity {
  const UserModel({
    required super.id,
    required super.email,
    required super.name,
    super.phone,
    super.avatarUrl,
    required super.userType,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['public_id'] as String? ?? json['id'].toString(),
      email: json['email'] as String,
      name: json['full_name'] as String? ??
          '${json['first_name'] ?? ''} ${json['last_name'] ?? ''}'.trim(),
      phone: json['phone_number'] as String?,
      avatarUrl: json['avatar'] as String?,
      userType: json['user_type'] as String? ?? 'FREE',
    );
  }
}
