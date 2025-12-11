import { Chip } from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  School as LessonIcon,
  Quiz as QuizIcon,
  CardGiftcard as GiftIcon,
  Star as StarIcon,
} from '@mui/icons-material';

const sourceTypeIcons: Record<string, React.ReactElement> = {
  quiz_attempt: <QuizIcon fontSize="small" />,
  quiz_perfect: <StarIcon fontSize="small" />,
  lesson: <LessonIcon fontSize="small" />,
  challenge: <TrophyIcon fontSize="small" />,
  referral: <GiftIcon fontSize="small" />,
};

const sourceTypeColors: Record<string, string> = {
  quiz_attempt: '#4169E1',
  quiz_perfect: '#FFD700',
  lesson: '#32CD32',
  challenge: '#FF8C00',
  referral: '#FF1493',
  daily_mission: '#9370DB',
  flashcard_study: '#00CED1',
};

interface SourceTypeBadgeProps {
  sourceType: string;
}

export const SourceTypeBadge: React.FC<SourceTypeBadgeProps> = ({ sourceType }) => (
  <Chip
    icon={sourceTypeIcons[sourceType]}
    label={sourceType.replace(/_/g, ' ')}
    size="small"
    sx={{
      backgroundColor: sourceTypeColors[sourceType] || '#808080',
      color: 'white',
      fontWeight: 'bold',
      textTransform: 'capitalize',
    }}
  />
);
