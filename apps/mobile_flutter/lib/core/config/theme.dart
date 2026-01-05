import 'package:flutter/material.dart';

/// Feng Shui Color Palette - matching React Native design
class AppColors {
  // Primary - Màu may mắn (Lucky Red)
  static const Color primaryRed = Color(0xFFC41E3A); // Đỏ may mắn chính
  static const Color primaryRedDark = Color(0xFF8B0000); // Đỏ đậm
  static const Color primaryRedLight = Color(0xFFE63946); // Đỏ sáng

  // Secondary - Vàng kim (Gold)
  static const Color secondaryGold = Color(0xFFFFD700); // Vàng kim
  static const Color secondaryGoldDark = Color(0xFFDAA520); // Vàng đậm
  static const Color secondaryGoldLight = Color(0xFFFFF8DC); // Vàng nhạt/kem

  // Accent - Màu phụ
  static const Color accentJade = Color(0xFF00A86B); // Xanh ngọc - growth, learning
  static const Color accentBrown = Color(0xFF8B4513); // Nâu gỗ - stability
  static const Color accentCream = Color(0xFFFFF8DC); // Kem - softness

  // Neutral
  static const Color white = Color(0xFFFFFFFF);
  static const Color black = Color(0xFF000000);
  
  // Gray scale
  static const Color gray50 = Color(0xFFF9FAFB);
  static const Color gray100 = Color(0xFFF3F4F6);
  static const Color gray200 = Color(0xFFE5E7EB);
  static const Color gray300 = Color(0xFFD1D5DB);
  static const Color gray400 = Color(0xFF9CA3AF);
  static const Color gray500 = Color(0xFF6B7280);
  static const Color gray600 = Color(0xFF4B5563);
  static const Color gray700 = Color(0xFF374151);
  static const Color gray800 = Color(0xFF1F2937);
  static const Color gray900 = Color(0xFF111827);

  // Semantic
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);
}

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primaryRed,
        primary: AppColors.primaryRed,
        secondary: AppColors.secondaryGold,
        surface: AppColors.white,
        error: AppColors.error,
      ),
      scaffoldBackgroundColor: AppColors.gray50,
      
      // AppBar theme - gradient will be applied in widgets
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.primaryRed,
        foregroundColor: AppColors.white,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: AppColors.white,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
      
      // Card theme
      cardTheme: CardThemeData(
        color: AppColors.white,
        elevation: 2,
        shadowColor: AppColors.black.withOpacity(0.1),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      
      // Elevated button theme - gradient will be applied in widgets
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryRed,
          foregroundColor: AppColors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 0,
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      
      // Text button theme
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primaryRed,
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      
      // Input decoration theme
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppColors.gray200),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppColors.gray200),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primaryRed, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        labelStyle: TextStyle(
          color: AppColors.gray700,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
        hintStyle: TextStyle(
          color: AppColors.gray400,
          fontSize: 14,
        ),
      ),
      
      // Text theme
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: AppColors.gray900,
        ),
        displayMedium: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.bold,
          color: AppColors.gray900,
        ),
        displaySmall: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.bold,
          color: AppColors.gray900,
        ),
        headlineMedium: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: AppColors.gray900,
        ),
        titleLarge: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: AppColors.gray900,
        ),
        titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
          color: AppColors.gray900,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          color: AppColors.gray700,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          color: AppColors.gray700,
        ),
        bodySmall: TextStyle(
          fontSize: 12,
          color: AppColors.gray600,
        ),
      ),
    );
  }
}
