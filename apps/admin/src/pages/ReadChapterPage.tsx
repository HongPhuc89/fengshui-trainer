import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loading, useNotify } from 'react-admin';
import axios from 'axios';
import { Box, Card, CardContent, Typography, Button, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { AuthenticatedFileViewer, useAuthenticatedFileDownload } from '../components/AuthenticatedFileViewer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface UploadedFile {
  id: number;
  original_name: string;
  path: string;
  size: number;
  mimetype: string;
}

interface Chapter {
  id: number;
  book_id: number;
  title: string;
  file_id?: number | null;
  file?: UploadedFile | null;
}

export const ReadChapterPage = () => {
  const { bookId, chapterId } = useParams<{ bookId: string; chapterId: string }>();
  const navigate = useNavigate();
  const notify = useNotify();

  const [loading, setLoading] = useState(true);
  const [chapter, setChapter] = useState<Chapter | null>(null);

  const { download, loading: downloadLoading } = useAuthenticatedFileDownload(chapter?.file || null);

  useEffect(() => {
    fetchChapter();
  }, [bookId, chapterId]);

  const fetchChapter = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/books/${bookId}/chapters/${chapterId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChapter(response.data);
    } catch (error) {
      notify('Error loading chapter', { type: 'error' });
      console.error('Error fetching chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!chapter) return <div>Chapter not found</div>;

  const file = chapter.file;

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Card sx={{ borderRadius: 0 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate(`/chapters/${bookId}/${chapterId}`)}>
              <ArrowBackIcon />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5">{chapter.title}</Typography>
              {file && (
                <Typography variant="caption" color="text.secondary">
                  {file.original_name}
                </Typography>
              )}
            </Box>
            {file && (
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={download} disabled={downloadLoading}>
                Download
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#f5f5f5' }}>
        {file ? (
          <Box sx={{ width: '100%', height: '100%', p: 2 }}>
            <AuthenticatedFileViewer file={file} height="100%" />
          </Box>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center', maxWidth: 600, mx: 'auto', mt: 8 }}>
            <MenuBookIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
            <Typography variant="h5" color="text.secondary" gutterBottom>
              No file uploaded
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Vui lòng upload file để đọc nội dung chapter này.
            </Typography>
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={() => navigate(`/chapters/${bookId}/${chapterId}`)}
              sx={{ mt: 2 }}
            >
              Go to Chapter Details
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};
