import { Box, TextField, FormControlLabel, Radio, Typography } from '@mui/material';

interface Option {
  id: string;
  text: string;
}

interface MultipleChoiceFormProps {
  options: Option[];
  correctAnswer: string;
  onUpdateOption: (index: number, text: string) => void;
  onSelectCorrect: (id: string) => void;
}

export const MultipleChoiceForm = ({
  options,
  correctAnswer,
  onUpdateOption,
  onSelectCorrect,
}: MultipleChoiceFormProps) => {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Options (select the correct answer):
      </Typography>
      {options.map((opt, idx) => (
        <Box key={opt.id} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
          <TextField
            label={`Option ${opt.id.toUpperCase()}`}
            fullWidth
            value={opt.text}
            onChange={(e) => onUpdateOption(idx, e.target.value)}
            size="small"
          />
          <FormControlLabel
            control={<Radio checked={correctAnswer === opt.id} onChange={() => onSelectCorrect(opt.id)} />}
            label="Correct"
          />
        </Box>
      ))}
    </Box>
  );
};
