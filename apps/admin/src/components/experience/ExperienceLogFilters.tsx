import { Card, CardContent } from '@mui/material';
import { FilterList, FilterListItem, useListContext } from 'react-admin';
import { Quiz as QuizIcon } from '@mui/icons-material';

export const ExperienceLogFilters = () => {
  const { data } = useListContext();

  // Calculate stats by source type from current page data
  const sourceStats = (data || []).reduce(
    (acc, log: any) => {
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
                <span style={{ textTransform: 'capitalize' }}>
                  {type.replace(/_/g, ' ')} ({count as number})
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
