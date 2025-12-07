import { Box, TextField, FormControlLabel, Checkbox, FormGroup, Typography } from '@mui/material';

interface Option {
  id: string;
  text: string;
}

interface MultipleAnswerFormProps {
  options: Option[];
  correctAnswers: string[];
  onUpdateOption: (index: number, text: string) => void;
  onToggleCorrect: (id: string) => void;
}

export const MultipleAnswerForm = ({
  options,
  correctAnswers,
  onUpdateOption,
  onToggleCorrect,
}: MultipleAnswerFormProps) => {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Options (check all correct answers):
      </Typography>
      <FormGroup>
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
              control={<Checkbox checked={correctAnswers.includes(opt.id)} onChange={() => onToggleCorrect(opt.id)} />}
              label="Correct"
            />
          </Box>
        ))}
      </FormGroup>
    </Box>
  );
};
