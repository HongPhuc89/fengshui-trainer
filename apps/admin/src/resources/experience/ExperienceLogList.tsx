import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  ReferenceField,
  FunctionField,
  FilterList,
  FilterListItem,
  useGetList,
} from 'react-admin';
import { Card, CardContent, Chip } from '@mui/material';
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

const ExperienceLogFilters = () => {
  const { data: stats } = useGetList('experience-logs', {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: 'created_at', order: 'DESC' },
  });

  // Calculate stats by source type
  const sourceStats = stats?.reduce(
    (acc, log) => {
      const type = log.source_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <Card sx={{ order: -1, mr: 2, mt: 9, width: 250 }}>
      <CardContent>
        <FilterList label="Source Type" icon={<QuizIcon />}>
          {Object.entries(sourceStats || {}).map(([type, count]) => (
            <FilterListItem
              key={type}
              label={
                <span>
                  {type.replace(/_/g, ' ')} ({count})
                </span>
              }
              value={{ source_type: type }}
            />
          ))}
        </FilterList>
      </CardContent>
    </Card>
  );
};

export const ExperienceLogList = () => (
  <List
    filters={<ExperienceLogFilters />}
    sort={{ field: 'created_at', order: 'DESC' }}
    perPage={25}
    aside={<ExperienceLogFilters />}
  >
    <Datagrid bulkActionButtons={false}>
      <ReferenceField source="user_id" reference="users" link="show">
        <TextField source="email" />
      </ReferenceField>

      <FunctionField
        label="Source"
        render={(record: any) => (
          <Chip
            icon={sourceTypeIcons[record.source_type]}
            label={record.source_type.replace(/_/g, ' ')}
            size="small"
            sx={{
              backgroundColor: sourceTypeColors[record.source_type] || '#808080',
              color: 'white',
              fontWeight: 'bold',
            }}
          />
        )}
      />

      <NumberField
        source="xp"
        label="XP"
        sx={(record: any) => ({
          color: record.xp > 0 ? 'success.main' : 'error.main',
          fontWeight: 'bold',
        })}
      />

      <TextField source="description" />

      <DateField source="created_at" showTime />
    </Datagrid>
  </List>
);
