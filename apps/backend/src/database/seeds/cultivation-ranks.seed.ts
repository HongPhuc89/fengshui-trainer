/**
 * Cultivation Ranks Seed Data
 *
 * This file contains the master data for cultivation ranks (levels)
 * inspired by Chinese xianxia/cultivation novels.
 *
 * Each rank represents a stage in the user's learning journey,
 * themed as a cultivation path from mortal to transcendent.
 */

export interface CultivationRank {
  level: number;
  xp_required: number;
  title: string;
  description: string;
  color: string;
  icon?: string;
  rewards?: {
    badges?: string[];
    features?: string[];
    bonuses?: {
      xp_multiplier?: number;
      daily_bonus?: number;
    };
  };
}

/**
 * Master data for cultivation ranks
 *
 * Progression follows traditional cultivation stages:
 * 1. Phàm Nhân (Mortal) - Starting point
 * 2. Luyện Khí (Qi Refinement) - Building foundation
 * 3. Trúc Cơ (Foundation Establishment) - Solidifying base
 * 4. Kim Đan (Golden Core) - Major breakthrough
 * 5. Nguyên Anh (Nascent Soul) - Spiritual awakening
 * 6. Hóa Thần (Soul Transformation) - Divine transformation
 * 7. Luyện Hư (Void Refinement) - Mastering emptiness
 * 8. Đại Thừa (Great Vehicle) - Near perfection
 * 9. Độ Kiếp (Tribulation Transcendence) - Ultimate achievement
 */
export const CULTIVATION_RANKS: CultivationRank[] = [
  {
    level: 1,
    xp_required: 0,
    title: 'Phàm Nhân',
    description: 'Người phàm bắt đầu hành trình tu luyện',
    color: '#808080', // Gray - mortal realm
    icon: 'mortal',
    rewards: {
      badges: ['first_step'],
      features: [],
      bonuses: {
        xp_multiplier: 1.0,
        daily_bonus: 0,
      },
    },
  },
  {
    level: 2,
    xp_required: 100,
    title: 'Luyện Khí',
    description: 'Tích lũy khí lực, rèn luyện cơ bản',
    color: '#4169E1', // Royal Blue - gathering qi
    icon: 'qi_refinement',
    rewards: {
      badges: ['qi_gatherer'],
      features: ['basic_stats'],
      bonuses: {
        xp_multiplier: 1.05,
        daily_bonus: 2,
      },
    },
  },
  {
    level: 3,
    xp_required: 250,
    title: 'Trúc Cơ',
    description: 'Xây dựng nền tảng vững chắc',
    color: '#32CD32', // Lime Green - solid foundation
    icon: 'foundation',
    rewards: {
      badges: ['foundation_builder'],
      features: ['custom_avatar', 'study_streak'],
      bonuses: {
        xp_multiplier: 1.1,
        daily_bonus: 5,
      },
    },
  },
  {
    level: 4,
    xp_required: 500,
    title: 'Kim Đan',
    description: 'Ngưng tụ kim đan, bước vào cảnh giới mới',
    color: '#FFD700', // Gold - golden core
    icon: 'golden_core',
    rewards: {
      badges: ['golden_core_master'],
      features: ['advanced_stats', 'leaderboard'],
      bonuses: {
        xp_multiplier: 1.15,
        daily_bonus: 8,
      },
    },
  },
  {
    level: 5,
    xp_required: 1000,
    title: 'Nguyên Anh',
    description: 'Nguyên anh xuất thế, sức mạnh tăng vọt',
    color: '#FF8C00', // Dark Orange - nascent soul
    icon: 'nascent_soul',
    rewards: {
      badges: ['soul_awakened'],
      features: ['premium_content', 'offline_study'],
      bonuses: {
        xp_multiplier: 1.2,
        daily_bonus: 10,
      },
    },
  },
  {
    level: 6,
    xp_required: 2000,
    title: 'Hóa Thần',
    description: 'Nguyên thần hóa thành, thông suốt thiên địa',
    color: '#FF4500', // Orange Red - soul transformation
    icon: 'soul_transformation',
    rewards: {
      badges: ['divine_transformation'],
      features: ['ai_tutor', 'custom_quizzes'],
      bonuses: {
        xp_multiplier: 1.25,
        daily_bonus: 15,
      },
    },
  },
  {
    level: 7,
    xp_required: 4000,
    title: 'Luyện Hư',
    description: 'Luyện hóa hư không, tiến gần đạo',
    color: '#9370DB', // Medium Purple - void refinement
    icon: 'void_refinement',
    rewards: {
      badges: ['void_master'],
      features: ['advanced_analytics', 'mentor_access'],
      bonuses: {
        xp_multiplier: 1.3,
        daily_bonus: 20,
      },
    },
  },
  {
    level: 8,
    xp_required: 8000,
    title: 'Đại Thừa',
    description: 'Đại thành cảnh giới, cận kề đỉnh cao',
    color: '#FF1493', // Deep Pink - great vehicle
    icon: 'great_vehicle',
    rewards: {
      badges: ['great_master'],
      features: ['exclusive_content', 'priority_support'],
      bonuses: {
        xp_multiplier: 1.4,
        daily_bonus: 25,
      },
    },
  },
  {
    level: 9,
    xp_required: 15000,
    title: 'Độ Kiếp',
    description: 'Vượt qua thiên kiếp, thành tựu phi phàm',
    color: '#00CED1', // Dark Turquoise - tribulation transcendence
    icon: 'tribulation',
    rewards: {
      badges: ['immortal_ascended', 'legend'],
      features: ['all_features', 'hall_of_fame'],
      bonuses: {
        xp_multiplier: 1.5,
        daily_bonus: 50,
      },
    },
  },
];

/**
 * Get rank by level number
 */
export function getRankByLevel(level: number): CultivationRank | undefined {
  return CULTIVATION_RANKS.find((rank) => rank.level === level);
}

/**
 * Get rank by XP amount
 */
export function getRankByXP(xp: number): CultivationRank {
  // Find the highest rank the user has achieved
  const sortedRanks = [...CULTIVATION_RANKS].sort((a, b) => b.xp_required - a.xp_required);

  return sortedRanks.find((rank) => xp >= rank.xp_required) || CULTIVATION_RANKS[0];
}

/**
 * Get next rank
 */
export function getNextRank(currentLevel: number): CultivationRank | null {
  return CULTIVATION_RANKS.find((rank) => rank.level === currentLevel + 1) || null;
}

/**
 * Calculate progress to next rank
 */
export function calculateRankProgress(currentXP: number): {
  currentRank: CultivationRank;
  nextRank: CultivationRank | null;
  progress: number;
  xpRemaining: number;
  isMaxRank: boolean;
} {
  const currentRank = getRankByXP(currentXP);
  const nextRank = getNextRank(currentRank.level);

  if (!nextRank) {
    return {
      currentRank,
      nextRank: null,
      progress: 100,
      xpRemaining: 0,
      isMaxRank: true,
    };
  }

  const xpInCurrentRank = currentXP - currentRank.xp_required;
  const xpNeededForNext = nextRank.xp_required - currentRank.xp_required;
  const progress = Math.round((xpInCurrentRank / xpNeededForNext) * 1000) / 10;

  return {
    currentRank,
    nextRank,
    progress: Math.min(progress, 100),
    xpRemaining: nextRank.xp_required - currentXP,
    isMaxRank: false,
  };
}

/**
 * Get all ranks
 */
export function getAllRanks(): CultivationRank[] {
  return CULTIVATION_RANKS;
}
