// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNotify } from 'react-admin';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Box, Button, Typography, Chip, Paper, Stack, Divider } from '@mui/material';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import PreviewIcon from '@mui/icons-material/Preview';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import EditIcon from '@mui/icons-material/Edit';
import { MarkmapPreview } from './MindMapPreview';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface MindMap {
  id: number;
  chapterId: number;
  title: string;
  description?: string;
  markdown_content?: string;
  structure: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const MindMapTab = ({ chapterId }: { chapterId: number }) => {
  const [mindMap, setMindMap] = useState<MindMap | null>(null);
  const [loading, setLoading] = useState(true);
  const notify = useNotify();
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();

  useEffect(() => {
    fetchMindMap();
  }, [chapterId]);

  const fetchMindMap = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/chapters/${chapterId}/mindmap`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMindMap(response.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        notify('Error loading mind map', { type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrEdit = () => {
    navigate(`/chapters/${bookId}/${chapterId}/mindmap/edit`);
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');

      // Build a simple structure from markdown for backward compatibility
      const structure = {
        version: '1.0',
        layout: 'tree',
        centerNode: { id: 'root', text: formData.title },
        nodes: [],
      };

      const payload = {
        ...formData,
        markdown_content: markdownContent,
        structure,
      };

      if (mindMap) {
        await axios.put(`${API_URL}/admin/chapters/${chapterId}/mindmap`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        notify('✓ Mind map updated!', { type: 'success' });
      } else {
        await axios.post(`${API_URL}/admin/chapters/${chapterId}/mindmap`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        notify('✓ Mind map created!', { type: 'success' });
      }

      setEditDialogOpen(false);
      fetchMindMap();
    } catch (error: any) {
      notify(error.response?.data?.message || 'Error saving mind map', { type: 'error' });
    }
  };

  const handleToggleActive = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${API_URL}/admin/chapters/${chapterId}/mindmap/toggle-active`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setMindMap(response.data);
      notify(`✓ Mind map ${response.data.is_active ? 'activated' : 'deactivated'}`, { type: 'success' });
    } catch (error) {
      notify('Error toggling status', { type: 'error' });
    }
  };

  const getDefaultMarkdown = () => {
    return `# Chapter ${chapterId} Main Topic

## Key Concept 1
- Sub-point 1.1
- Sub-point 1.2
  - Detail 1.2.1
  - Detail 1.2.2

## Key Concept 2
- Sub-point 2.1
- Sub-point 2.2

## Key Concept 3
- Sub-point 3.1
  - Detail 3.1.1
- Sub-point 3.2
`;
  };

  if (loading) return <Typography>Loading mind map...</Typography>;

  return (
    <Box>
      {!mindMap ? (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f8f9fa' }}>
          <AccountTreeIcon sx={{ fontSize: 64, color: '#ddd', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Mind Map Yet
          </Typography>
          <Typography color="textSecondary" paragraph>
            Create a visual mind map using Markdown to help users understand chapter concepts
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleCreateOrEdit}
            sx={{ borderRadius: 3 }}
          >
            Create Mind Map
          </Button>
        </Paper>
      ) : (
        <Stack spacing={2}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="h5" gutterBottom>
                  {mindMap.title}
                </Typography>
                {mindMap.description && <Typography color="textSecondary">{mindMap.description}</Typography>}
              </Box>
              <Chip
                icon={mindMap.is_active ? <VisibilityIcon /> : <VisibilityOffIcon />}
                label={mindMap.is_active ? 'Active' : 'Inactive'}
                color={mindMap.is_active ? 'success' : 'default'}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f8f9fa', borderRadius: 2, flex: 1 }}>
                <Typography variant="caption" color="textSecondary">
                  Last Updated
                </Typography>
                <Typography variant="h6" color="primary">
                  {new Date(mindMap.updated_at).toLocaleDateString()}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f8f9fa', borderRadius: 2, flex: 1 }}>
                <Typography variant="caption" color="textSecondary">
                  Format
                </Typography>
                <Typography variant="h6" color="primary">
                  Markmap
                </Typography>
              </Box>
            </Box>

            {mindMap.markdown_content && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PreviewIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Mind Map Preview
                    </Typography>
                  </Box>
                  <Chip
                    label="Interactive Preview"
                    size="small"
                    color="primary"
                    variant="outlined"
                    icon={<AccountTreeIcon />}
                  />
                </Box>
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    bgcolor: '#fafafa',
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                  }}
                >
                  <MarkmapPreview markdown={mindMap.markdown_content} />
                  <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="caption" color="textSecondary" sx={{ flex: 1 }}>
                      💡 Click nodes to expand/collapse • Scroll to zoom • Drag to pan
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            )}

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleCreateOrEdit}
                sx={{ borderRadius: 2 }}
              >
                Edit Mind Map
              </Button>
              <Button variant="outlined" onClick={handleToggleActive} sx={{ borderRadius: 2 }}>
                {mindMap.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </Stack>
          </Paper>
        </Stack>
      )}
    </Box>
  );
};
