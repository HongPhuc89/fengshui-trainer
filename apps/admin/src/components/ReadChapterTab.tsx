import { Box, Typography, Button } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DownloadIcon from '@mui/icons-material/Download';
import { AuthenticatedFileViewer, useAuthenticatedFileDownload } from './AuthenticatedFileViewer';

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
  const { download, loading } = useAuthenticatedFileDownload(file || null);

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
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={download} disabled={loading}>
          Download
        </Button>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <AuthenticatedFileViewer file={file} />
      </Box>
    </Box>
  );
};
