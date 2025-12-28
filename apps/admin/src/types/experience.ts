export interface Level {
  id: number;
  level: number;
  xp_required: number;
  title: string;
  icon?: string;
  color?: string;
  rewards?: {
    badges?: string[];
    features?: string[];
    bonuses?: {
      xp_multiplier?: number;
      daily_bonus?: number;
    };
  };
  created_at: string;
  updated_at: string;
}

export interface UserExperienceLog {
  id: number;
  user_id: number;
  source_type: string;
  source_id?: number;
  xp: number;
  description?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    email: string;
    full_name?: string;
  };
}

export interface UserExperienceSummary {
  user_id: number;
  total_xp: number;
  current_level: Level;
  next_level: {
    id: number;
    level: number;
    xp_required: number;
    title: string;
    color?: string;
    xp_remaining: number;
    progress_percentage: number;
  } | null;
}
