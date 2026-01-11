import { Box, CircularProgress, Alert, Typography, Button } from '@mui/material';
import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface UploadedFile {
  id: number;
  original_name: string;
  path: string;
  size: number;
  mimetype: string;
}

interface AuthenticatedFileViewerProps {
  file: UploadedFile;
  height?: string;
}

export const AuthenticatedFileViewer: React.FC<AuthenticatedFileViewerProps> = ({ file, height = '800px' }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuthenticatedFile();

    // Cleanup blob URL when component unmounts or file changes
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [file.id]);

  const fetchAuthenticatedFile = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Extract file ID from path (e.g., "/api/media/123" -> 123)
      const fileId = file.path.split('/').pop();
      const response = await fetch(`${API_URL}/media/${fileId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Revoke old blob URL if exists
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }

      setBlobUrl(url);
    } catch (err) {
      console.error('Error fetching authenticated file:', err);
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const isPDF = file.mimetype === 'application/pdf';
  const isViewable = isPDF;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="body2">{error}</Typography>
        <Button size="small" onClick={fetchAuthenticatedFile} sx={{ mt: 1 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (!blobUrl) {
    return null;
  }

  if (!isViewable) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          This file type cannot be previewed in the browser.
        </Typography>
        <Typography variant="body2">Click the "Download" button to view the file.</Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%', height }}>
      <iframe
        src={blobUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '4px',
        }}
        title={file.original_name}
      />
    </Box>
  );
};

// Hook to get blob URL for download
export const useAuthenticatedFileDownload = (file: UploadedFile | null) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (file) {
      fetchFile();
    }

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [file?.id]);

  const fetchFile = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const fileId = file.path.split('/').pop();
      const response = await fetch(`${API_URL}/media/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        setBlobUrl(url);
      }
    } catch (err) {
      console.error('Error fetching file:', err);
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!blobUrl || !file) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = file.original_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return { blobUrl, loading, download };
};
