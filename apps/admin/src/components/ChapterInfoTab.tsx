import { useState } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, IconButton } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axios from 'axios';
import { useNotify } from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { useAuthenticatedFileDownload } from './AuthenticatedFileViewer';

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
  content: string;
  order_index: number;
  status: string;
  points?: number;
  file_id?: number | null;
  file?: UploadedFile | null;
  infographic_file_id?: number | null;
  infographic_file?: UploadedFile | null;
  created_at: string;
  updated_at: string;
}

interface ChapterInfoTabProps {
  chapter: Chapter;
}

export const ChapterInfoTab: React.FC<ChapterInfoTabProps> = ({ chapter }) => {
  const notify = useNotify();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [uploadingInfographic, setUploadingInfographic] = useState(false);
  const [currentFile, setCurrentFile] = useState<UploadedFile | null>(chapter.file || null);
  const [currentInfographic, setCurrentInfographic] = useState<UploadedFile | null>(chapter.infographic_file || null);

  const { download, loading: downloadLoading } = useAuthenticatedFileDownload(currentFile);
  const { download: downloadInfographic, loading: downloadInfographicLoading } =
    useAuthenticatedFileDownload(currentInfographic);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/epub+zip',
      'text/markdown',
    ];

    if (!allowedTypes.includes(file.type)) {
      notify('Invalid file type. Please upload PDF, DOCX, TXT, EPUB, or Markdown files.', { type: 'error' });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      notify('File size exceeds 20MB limit', { type: 'error' });
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem('token');

      // Step 1: Upload file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'chapter');

      const uploadResponse = await axios.post(`${API_URL}/admin/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadedFile = uploadResponse.data;

      // Step 2: Update chapter with file_id
      await axios.put(
        `${API_URL}/admin/books/${chapter.book_id}/chapters/${chapter.id}`,
        { file_id: uploadedFile.id },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setCurrentFile(uploadedFile);
      notify('File uploaded successfully', { type: 'success' });
    } catch (error: any) {
      console.error('Upload error:', error);
      notify(error.response?.data?.message || 'Error uploading file', { type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleFileRemove = async () => {
    if (!window.confirm('Are you sure you want to remove this file?')) return;

    try {
      const token = localStorage.getItem('token');

      await axios.put(
        `${API_URL}/admin/books/${chapter.book_id}/chapters/${chapter.id}`,
        { file_id: null },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setCurrentFile(null);
      notify('File removed successfully', { type: 'success' });
    } catch (error: any) {
      console.error('Remove error:', error);
      notify(error.response?.data?.message || 'Error removing file', { type: 'error' });
    }
  };

  const handleInfographicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      notify('Please upload a PDF file for infographic', { type: 'error' });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      notify('File size exceeds 20MB limit', { type: 'error' });
      return;
    }

    setUploadingInfographic(true);

    try {
      const token = localStorage.getItem('token');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'infographic');

      const uploadResponse = await axios.post(`${API_URL}/admin/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadedFile = uploadResponse.data;

      await axios.put(
        `${API_URL}/admin/books/${chapter.book_id}/chapters/${chapter.id}`,
        { infographic_file_id: uploadedFile.id },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setCurrentInfographic(uploadedFile);
      notify('Infographic uploaded successfully', { type: 'success' });
    } catch (error: any) {
      console.error('Upload error:', error);
      notify(error.response?.data?.message || 'Error uploading infographic', { type: 'error' });
    } finally {
      setUploadingInfographic(false);
    }
  };

  const handleInfographicRemove = async () => {
    if (!window.confirm('Are you sure you want to remove this infographic?')) return;

    try {
      const token = localStorage.getItem('token');

      await axios.put(
        `${API_URL}/admin/books/${chapter.book_id}/chapters/${chapter.id}`,
        { infographic_file_id: null },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setCurrentInfographic(null);
      notify('Infographic removed successfully', { type: 'success' });
    } catch (error: any) {
      console.error('Remove error:', error);
      notify(error.response?.data?.message || 'Error removing infographic', { type: 'error' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

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

      {chapter.points !== undefined && (
        <div>
          <Typography variant="subtitle2" color="textSecondary">
            Points
          </Typography>
          <Typography>{chapter.points}</Typography>
        </div>
      )}

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

      {/* File Upload Section */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
        {/* Chapter File */}
        <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Chapter File
          </Typography>

          {currentFile ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" fontWeight="medium" noWrap sx={{ maxWidth: 200 }}>
                  {currentFile.original_name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {formatFileSize(currentFile.size)} • {currentFile.mimetype}
                </Typography>
              </Box>
              <IconButton
                size="small"
                color="primary"
                onClick={() => navigate(`/chapters/${chapter.book_id}/${chapter.id}/read`)}
                title="View file"
              >
                <VisibilityIcon />
              </IconButton>
              <IconButton
                size="small"
                color="primary"
                onClick={download}
                disabled={downloadLoading}
                title="Download file"
              >
                <DownloadIcon />
              </IconButton>
              <IconButton size="small" color="error" onClick={handleFileRemove} title="Remove file">
                <DeleteIcon />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ mt: 1 }}>
              <input
                accept=".pdf,.doc,.docx,.txt,.epub,.md"
                style={{ display: 'none' }}
                id="chapter-file-upload"
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <label htmlFor="chapter-file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={uploading ? <CircularProgress size={20} /> : <UploadFileIcon />}
                  disabled={uploading}
                  fullWidth
                >
                  {uploading ? 'Uploading...' : 'Upload File'}
                </Button>
              </label>
            </Box>
          )}
        </Box>

        {/* Infographic File */}
        <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Infographic File
          </Typography>

          {currentInfographic ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" fontWeight="medium" noWrap sx={{ maxWidth: 200 }}>
                  {currentInfographic.original_name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {formatFileSize(currentInfographic.size)} • PDF
                </Typography>
              </Box>
              <IconButton
                size="small"
                color="primary"
                onClick={() => navigate(`/chapters/${chapter.book_id}/${chapter.id}/read?type=infographic`)}
                title="View infographic"
              >
                <VisibilityIcon />
              </IconButton>
              <IconButton
                size="small"
                color="primary"
                onClick={downloadInfographic}
                disabled={downloadInfographicLoading}
                title="Download infographic"
              >
                <DownloadIcon />
              </IconButton>
              <IconButton size="small" color="error" onClick={handleInfographicRemove} title="Remove infographic">
                <DeleteIcon />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ mt: 1 }}>
              <input
                accept="application/pdf"
                style={{ display: 'none' }}
                id="infographic-file-upload"
                type="file"
                onChange={handleInfographicUpload}
                disabled={uploadingInfographic}
              />
              <label htmlFor="infographic-file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={uploadingInfographic ? <CircularProgress size={20} /> : <UploadFileIcon />}
                  disabled={uploadingInfographic}
                  fullWidth
                >
                  {uploadingInfographic ? 'Uploading...' : 'Upload Infographic'}
                </Button>
              </label>
            </Box>
          )}
        </Box>
      </Box>

      <Alert severity="info" sx={{ mt: 1 }}>
        Supported formats: Chapter (PDF, DOCX, TXT, EPUB, MD), Infographic (PDF only). Max 20MB.
      </Alert>

      <div>
        <Typography variant="subtitle2" color="textSecondary">
          Created
        </Typography>
        <Typography>{new Date(chapter.created_at).toLocaleString()}</Typography>
      </div>
    </Box>
  );
};
