import { Box, Typography, Button, Alert } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DownloadIcon from '@mui/icons-material/Download';

interface UploadedFile {
  id: number;
  original_name: string;
  path: string;
  size: number;
  mimetype: string;
}

interface ReadChapterTabProps {
  file: UploadedFile | null | undefined;
}

export const ReadChapterTab: React.FC<ReadChapterTabProps> = ({ file }) => {
  if (!file) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <MenuBookIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No file uploaded
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload a file in the "Chapter Details" tab to read it here.
        </Typography>
      </Box>
    );
  }

  const isPDF = file.mimetype === 'application/pdf';
  const isViewable = isPDF; // Can extend to support more types

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
        <MenuBookIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">{file.original_name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {file.mimetype}
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => window.open(file.path, '_blank')}>
          Download
        </Button>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {isViewable ? (
          <Box sx={{ width: '100%', height: '800px' }}>
            <iframe
              src={file.path}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '4px',
              }}
              title={file.original_name}
            />
          </Box>
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              This file type cannot be previewed in the browser.
            </Typography>
            <Typography variant="body2">Click the "Download" button above to view the file.</Typography>
          </Alert>
        )}
      </Box>
    </Box>
  );
};
