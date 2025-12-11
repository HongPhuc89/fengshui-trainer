import { Edit, SimpleForm, TextInput, NumberInput, required } from 'react-admin';
import { Box, Typography } from '@mui/material';

export const LevelEdit = () => (
  <Edit>
    <SimpleForm>
      <Typography variant="h6" gutterBottom>
        Basic Information
      </Typography>

      <Box display="flex" gap={2} width="100%">
        <NumberInput source="level" label="Rank Level" validate={required()} disabled />
        <TextInput source="title" label="Rank Title" validate={required()} fullWidth />
      </Box>

      <Box display="flex" gap={2} width="100%">
        <NumberInput
          source="xp_required"
          label="XP Required"
          validate={required()}
          helperText="Minimum XP needed to reach this rank"
          fullWidth
        />
        <TextInput
          source="color"
          label="Color (Hex)"
          placeholder="#FFD700"
          helperText="Hex color code for rank badge"
          fullWidth
        />
      </Box>

      <TextInput source="icon" label="Icon" placeholder="🏆" helperText="Emoji or icon identifier" fullWidth />

      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Rewards (JSON)
      </Typography>

      <TextInput
        source="rewards"
        label="Rewards Configuration"
        multiline
        rows={8}
        helperText='JSON format: {"badges": ["badge1"], "features": ["feature1"], "bonuses": {"xp_multiplier": 1.5, "daily_bonus": 50}}'
        fullWidth
        format={(value) => (value ? JSON.stringify(value, null, 2) : '')}
        parse={(value) => {
          try {
            return value ? JSON.parse(value) : null;
          } catch {
            return value;
          }
        }}
      />
    </SimpleForm>
  </Edit>
);
