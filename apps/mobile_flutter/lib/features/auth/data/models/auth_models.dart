import 'package:equatable/equatable.dart';

class User extends Equatable {

  const User({
    required this.id,
    required this.email,
    required this.name,
    this.avatar,
    this.level = 1,
    this.experience = 0,
    this.points = 0,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as int,
      email: json['email'] as String,
      name: (json['name'] as String?) ?? json['email'] as String,
      avatar: json['avatar'] as String?,
      level: json['level'] as int? ?? 1,
      experience: json['experience'] as int? ?? 0,
      points: json['points'] as int? ?? 0,
    );
  }
  final int id;
  final String email;
  final String name;
  final String? avatar;
  final int level;
  final int experience;
  final int points;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'avatar': avatar,
      'level': level,
      'experience': experience,
      'points': points,
    };
  }

  @override
  List<Object?> get props =>
      [id, email, name, avatar, level, experience, points];
}

class LoginRequest {

  LoginRequest({required this.email, required this.password});
  final String email;
  final String password;

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      'password': password,
    };
  }
}

class RegisterRequest {

  RegisterRequest({
    required this.email,
    required this.password,
    required this.name,
  });
  final String email;
  final String password;
  final String name;

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      'password': password,
      'name': name,
    };
  }
}

class AuthResponse {

  AuthResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    // Handle both camelCase and snake_case
    final accessToken = (json['accessToken'] ?? json['access_token']) as String;
    final refreshToken =
        (json['refreshToken'] ?? json['refresh_token']) as String;

    return AuthResponse(
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: User.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
  final String accessToken;
  final String refreshToken;
  final User user;
}
