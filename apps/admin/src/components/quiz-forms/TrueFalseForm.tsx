import { Box, TextField, FormControl, RadioGroup, FormControlLabel, Radio, Typography } from '@mui/material';

interface TrueFalseFormProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export const TrueFalseForm = ({ value, onChange }: TrueFalseFormProps) => {
  return (
    <FormControl fullWidth>
      <Typography variant="subtitle2" gutterBottom>
        Correct Answer:
      </Typography>
      <RadioGroup value={value} onChange={(e) => onChange(e.target.value === 'true')}>
        <FormControlLabel value={true} control={<Radio />} label="True" />
        <FormControlLabel value={false} control={<Radio />} label="False" />
      </RadioGroup>
    </FormControl>
  );
};
