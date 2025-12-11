import { List, Datagrid, TextField, NumberField, DateField, FunctionField, EditButton } from 'react-admin';
import { Chip } from '@mui/material';

export const LevelList = () => (
  <List sort={{ field: 'level', order: 'ASC' }} perPage={25}>
    <Datagrid>
      <NumberField source="level" label="Rank Level" />

      <FunctionField
        label="Title"
        render={(record: any) => (
          <Chip
            label={record.title}
            size="small"
            sx={{
              backgroundColor: record.color || '#808080',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.875rem',
            }}
          />
        )}
      />

      <NumberField source="xp_required" label="XP Required" options={{ useGrouping: true }} />

      <TextField source="icon" />

      <FunctionField
        label="Rewards"
        render={(record: any) => {
          const rewards = record.rewards || {};
          const items = [
            ...(rewards.badges || []),
            ...(rewards.features || []),
            rewards.bonuses?.xp_multiplier ? `${rewards.bonuses.xp_multiplier}x XP` : null,
            rewards.bonuses?.daily_bonus ? `+${rewards.bonuses.daily_bonus} Daily` : null,
          ].filter(Boolean);

          return items.length > 0 ? items.join(', ') : '-';
        }}
      />

      <DateField source="created_at" showTime />

      <EditButton />
    </Datagrid>
  </List>
);
