import { Chip } from '@mui/material';

interface RankBadgeProps {
  title: string;
  color?: string;
  size?: 'small' | 'medium';
}

export const RankBadge: React.FC<RankBadgeProps> = ({ title, color, size = 'small' }) => (
  <Chip
    label={title}
    size={size}
    sx={{
      backgroundColor: color || '#808080',
      color: 'white',
      fontWeight: 'bold',
      fontSize: size === 'small' ? '0.875rem' : '1rem',
    }}
  />
);
