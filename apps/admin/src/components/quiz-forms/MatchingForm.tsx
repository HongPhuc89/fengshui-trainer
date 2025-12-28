import { Box, TextField, Typography, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

interface MatchingPair {
  id: number;
  left: string;
  right: string;
}

interface MatchingFormProps {
  pairs: MatchingPair[];
  onUpdatePair: (index: number, field: 'left' | 'right', value: string) => void;
  onAddPair: () => void;
  onRemovePair: (index: number) => void;
}

export const MatchingForm = ({ pairs, onUpdatePair, onAddPair, onRemovePair }: MatchingFormProps) => {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Matching Pairs:
      </Typography>
      {pairs.map((pair, idx) => (
        <Box key={pair.id} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
          <TextField
            label="Left"
            value={pair.left}
            onChange={(e) => onUpdatePair(idx, 'left', e.target.value)}
            size="small"
            sx={{ flex: 1 }}
          />
          <Typography>→</Typography>
          <TextField
            label="Right"
            value={pair.right}
            onChange={(e) => onUpdatePair(idx, 'right', e.target.value)}
            size="small"
            sx={{ flex: 1 }}
          />
          {pairs.length > 2 && (
            <IconButton size="small" onClick={() => onRemovePair(idx)} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ))}
      <IconButton onClick={onAddPair} size="small" color="primary">
        <AddIcon /> Add Pair
      </IconButton>
    </Box>
  );
};
