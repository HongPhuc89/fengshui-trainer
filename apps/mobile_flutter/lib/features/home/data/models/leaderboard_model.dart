import 'package:equatable/equatable.dart';

class LeaderboardLevel extends Equatable {
  final int id;
  final int level;
  final String title;
  final String color;

  const LeaderboardLevel({
    required this.id,
    required this.level,
    required this.title,
    required this.color,
  });

  factory LeaderboardLevel.fromJson(Map<String, dynamic> json) {
    return LeaderboardLevel(
      id: int.tryParse(json['id']?.toString() ?? '') ?? 0,
      level: int.tryParse(json['level']?.toString() ?? '') ?? 1,
      title: json['title'] as String? ?? 'Phàm Nhân',
      color: json['color'] as String? ?? '#808080',
    );
  }

  @override
  List<Object?> get props => [id, level, title, color];
}

class LeaderboardEntry extends Equatable {
  final int rank;
  final int userId;
  final String fullName;
  final String email;
  final int experiencePoints;
  final LeaderboardLevel level;

  const LeaderboardEntry({
    required this.rank,
    required this.userId,
    required this.fullName,
    required this.email,
    required this.experiencePoints,
    required this.level,
  });

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) {
    return LeaderboardEntry(
      rank: int.tryParse(json['rank']?.toString() ?? '') ?? 0,
      userId: int.tryParse(json['user_id']?.toString() ?? '') ?? 0,
      fullName: json['full_name'] as String? ?? 'Ẩn danh',
      email: json['email'] as String? ?? '',
      experiencePoints: int.tryParse(json['experience_points']?.toString() ?? '') ?? 0,
      level: LeaderboardLevel.fromJson(json['level'] as Map<String, dynamic>),
    );
  }

  @override
  List<Object?> get props => [rank, userId, fullName, email, experiencePoints, level];
}
