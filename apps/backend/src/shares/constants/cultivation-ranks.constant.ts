/**
 * Cultivation Ranks Constants
 *
 * Vietnamese xianxia-themed rank names for the gamification system
 */

export const CULTIVATION_RANK_NAMES = [
  'Phàm Nhân', // Level 1 - Mortal
  'Luyện Khí', // Level 2 - Qi Refinement
  'Trúc Cơ', // Level 3 - Foundation Establishment
  'Kim Đan', // Level 4 - Golden Core
  'Nguyên Anh', // Level 5 - Nascent Soul
  'Hóa Thần', // Level 6 - Soul Transformation
  'Luyện Hư', // Level 7 - Void Refinement
  'Đại Thừa', // Level 8 - Great Vehicle
  'Độ Kiếp', // Level 9 - Tribulation Transcendence
] as const;

export type CultivationRankName = (typeof CULTIVATION_RANK_NAMES)[number];

/**
 * Rank colors for UI display
 */
export const RANK_COLORS: Record<number, string> = {
  1: '#808080', // Gray - Phàm Nhân
  2: '#4169E1', // Royal Blue - Luyện Khí
  3: '#32CD32', // Lime Green - Trúc Cơ
  4: '#FFD700', // Gold - Kim Đan
  5: '#FF8C00', // Dark Orange - Nguyên Anh
  6: '#FF4500', // Orange Red - Hóa Thần
  7: '#9370DB', // Medium Purple - Luyện Hư
  8: '#FF1493', // Deep Pink - Đại Thừa
  9: '#00CED1', // Dark Turquoise - Độ Kiếp
};

/**
 * XP requirements for each rank
 */
export const RANK_XP_REQUIREMENTS: Record<number, number> = {
  1: 0,
  2: 100,
  3: 250,
  4: 500,
  5: 1000,
  6: 2000,
  7: 4000,
  8: 8000,
  9: 15000,
};

/**
 * Get rank name by level
 */
export function getRankName(level: number): string {
  if (level < 1 || level > CULTIVATION_RANK_NAMES.length) {
    return CULTIVATION_RANK_NAMES[0];
  }
  return CULTIVATION_RANK_NAMES[level - 1];
}

/**
 * Get rank color by level
 */
export function getRankColor(level: number): string {
  return RANK_COLORS[level] || RANK_COLORS[1];
}

/**
 * Get XP requirement for level
 */
export function getRankXPRequirement(level: number): number {
  return RANK_XP_REQUIREMENTS[level] || 0;
}
