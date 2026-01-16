import 'package:equatable/equatable.dart';

class User extends Equatable {

  const User({
    required this.id,
    required this.email,
    required this.name,
    this.avatar,
    this.level = 1,
    this.experience = 0,
    this.experiencePoints = 0,
    this.points = 0,
    this.totalXp,
    this.currentLevel,
    this.nextLevel,
    this.xpForNextLevel,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: int.tryParse(json['id']?.toString() ?? '') ?? 0,
      email: (json['email'] as String?) ?? '',
      name: (json['full_name'] as String?) ?? 
            (json['name'] as String?) ?? 
            (json['email'] as String?) ?? 
            'Unknown',
      avatar: json['avatar'] as String?,
      level: int.tryParse(json['level']?.toString() ?? '') ?? 1,
      experience: int.tryParse(json['experience']?.toString() ?? '') ?? 0,
      experiencePoints: int.tryParse(json['experience_points']?.toString() ?? '') ?? 0,
      points: int.tryParse(json['points']?.toString() ?? '') ?? 0,
      // New XP fields from /auth/me
      totalXp: int.tryParse(json['total_xp']?.toString() ?? ''),
      currentLevel: int.tryParse(json['current_level']?.toString() ?? ''),
      nextLevel: int.tryParse(json['next_level']?.toString() ?? ''),
      xpForNextLevel: int.tryParse(json['xp_for_next_level']?.toString() ?? ''),
    );
  }
  final int id;
  final String email;
  final String name;
  final String? avatar;
  final int level;
  final int experience;
  final int experiencePoints;
  final int points;
  
  // New XP fields
  final int? totalXp;
  final int? currentLevel;
  final int? nextLevel;
  final int? xpForNextLevel;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'avatar': avatar,
      'level': level,
      'experience': experience,
      'experience_points': experiencePoints,
      'points': points,
      'total_xp': totalXp,
      'current_level': currentLevel,
      'next_level': nextLevel,
      'xp_for_next_level': xpForNextLevel,
    };
  }

  @override
  List<Object?> get props =>
      [id, email, name, avatar, level, experience, experiencePoints, points, totalXp, currentLevel, nextLevel, xpForNextLevel];
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
