import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotify } from 'react-admin';
import axios from 'axios';
import {
  Box,
  Button,
  Typography,
  TextField,
  Alert,
  Switch,
  FormControlLabel,
  Stack,
  Tabs,
  Tab,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import PreviewIcon from '@mui/icons-material/Preview';
import CodeIcon from '@mui/icons-material/Code';
import { MarkmapPreview } from '../../components/MindMapPreview';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const ChapterMindMapEditPage = () => {
  const { bookId, chapterId } = useParams<{ bookId: string; chapterId: string }>();
  const navigate = useNavigate();
  const notify = useNotify();

  const [loading, setLoading] = useState(true);
  const [mindMap, setMindMap] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [markdownContent, setMarkdownContent] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    fetchMindMap();
  }, [chapterId]);

  const fetchMindMap = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/chapters/${chapterId}/mindmap`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = response.data;
      setMindMap(data);
      setFormData({
        title: data.title,
        description: data.description || '',
        is_active: data.is_active,
      });
      setMarkdownContent(data.markdown_content || getDefaultMarkdown());
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No mindmap yet, use defaults
        setFormData({
          title: `Chapter ${chapterId} Mind Map`,
          description: 'Visual overview of key concepts',
          is_active: true,
        });
        setMarkdownContent(getDefaultMarkdown());
      } else {
        notify('Error loading mind map', { type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');

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

      navigate(`/chapters/${bookId}/${chapterId}/mindmap`);
    } catch (error: any) {
      notify(error.response?.data?.message || 'Error saving mind map', { type: 'error' });
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

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={() => navigate(`/chapters/${bookId}/${chapterId}/mindmap`)}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" sx={{ ml: 2 }}>
              {mindMap ? 'Edit' : 'Create'} Mind Map
            </Typography>
          </Box>

          <Stack spacing={3}>
            <TextField
              label="Mind Map Title"
              fullWidth
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              variant="outlined"
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Visible to users"
            />

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
                <Tab icon={<CodeIcon />} label="Markdown Editor" />
                <Tab icon={<PreviewIcon />} label="Preview" />
              </Tabs>
            </Box>

            {activeTab === 0 && (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Markdown Syntax for Mindmap:
                  </Typography>
                  <Typography variant="caption" component="div">
                    • Use <code>#</code> for main topic, <code>##</code> for branches
                    <br />• Use <code>-</code> for bullet points
                    <br />• Indent with spaces to create hierarchy
                  </Typography>
                </Alert>
                <TextField
                  fullWidth
                  multiline
                  rows={20}
                  value={markdownContent}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                  placeholder="# Main Topic&#10;&#10;## Branch 1&#10;- Point 1"
                  sx={{
                    fontFamily: 'monospace',
                    '& textarea': {
                      fontFamily: 'monospace',
                      fontSize: '14px',
                    },
                  }}
                />
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Live Preview:
                </Typography>
                <MarkmapPreview markdown={markdownContent} />
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button onClick={() => navigate(`/chapters/${bookId}/${chapterId}/mindmap`)}>Cancel</Button>
              <Button
                onClick={handleSave}
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={!formData.title || !markdownContent}
              >
                {mindMap ? 'Update' : 'Create'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};
