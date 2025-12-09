import { Box, Typography } from '@mui/material';

interface Chapter {
  id: number;
  book_id: number;
  title: string;
  content: string;
  order_index: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ChapterInfoTabProps {
  chapter: Chapter;
}

export const ChapterInfoTab: React.FC<ChapterInfoTabProps> = ({ chapter }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div>
        <Typography variant="subtitle2" color="textSecondary">
          Title
        </Typography>
        <Typography variant="h6">{chapter.title}</Typography>
      </div>
      <div>
        <Typography variant="subtitle2" color="textSecondary">
          Order
        </Typography>
        <Typography>{chapter.order_index}</Typography>
      </div>
      <div>
        <Typography variant="subtitle2" color="textSecondary">
          Status
        </Typography>
        <Typography>{chapter.status}</Typography>
      </div>
      <div>
        <Typography variant="subtitle2" color="textSecondary">
          Content
        </Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{chapter.content}</Typography>
      </div>
      <div>
        <Typography variant="subtitle2" color="textSecondary">
          Created
        </Typography>
        <Typography>{new Date(chapter.created_at).toLocaleString()}</Typography>
      </div>
    </Box>
  );
};
