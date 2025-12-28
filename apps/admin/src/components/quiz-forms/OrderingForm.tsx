import { Box, TextField, Typography, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

interface OrderingItem {
  id: string;
  text: string;
  correct_order: number;
}

interface OrderingFormProps {
  items: OrderingItem[];
  onUpdateItem: (index: number, text: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export const OrderingForm = ({
  items,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  onMoveUp,
  onMoveDown,
}: OrderingFormProps) => {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Items (arrange in correct order):
      </Typography>
      {items.map((item, idx) => (
        <Box key={item.id} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
          <Typography variant="body2" sx={{ minWidth: 30 }}>
            {idx + 1}.
          </Typography>
          <TextField
            label={`Step ${idx + 1}`}
            fullWidth
            value={item.text}
            onChange={(e) => onUpdateItem(idx, e.target.value)}
            size="small"
          />
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <IconButton size="small" onClick={() => onMoveUp(idx)} disabled={idx === 0}>
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onMoveDown(idx)} disabled={idx === items.length - 1}>
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
          </Box>
          {items.length > 2 && (
            <IconButton size="small" onClick={() => onRemoveItem(idx)} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ))}
      <IconButton onClick={onAddItem} size="small" color="primary">
        <AddIcon /> Add Item
      </IconButton>
    </Box>
  );
};
