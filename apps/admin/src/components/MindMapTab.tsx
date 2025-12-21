// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { useNotify } from 'react-admin';
import axios from 'axios';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Switch,
  FormControlLabel,
  Paper,
  Stack,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import PreviewIcon from '@mui/icons-material/Preview';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import EditIcon from '@mui/icons-material/Edit';
import CodeIcon from '@mui/icons-material/Code';

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

// Markmap Preview Component (using iframe for isolation)
const MarkmapPreview = ({ markdown }: { markdown: string }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current || !markdown) return;

    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeDoc) return;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 20px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      overflow: hidden;
    }
    svg {
      width: 100%;
      height: calc(100vh - 40px);
      background: transparent;
    }
    /* Custom Markmap styles */
    .markmap-node circle {
      stroke-width: 2.5;
    }
    .markmap-node text {
      font-weight: 500;
      font-size: 14px;
    }
    .markmap-link {
      stroke-width: 2;
      opacity: 0.8;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-view@0.18"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-lib@0.18"></script>
</head>
<body>
  <svg id="mindmap"></svg>
  <script>
    const { Transformer } = window.markmap;
    const { Markmap } = window.markmapView;

    const markdown = \`${markdown.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;

    const transformer = new Transformer();
    const { root } = transformer.transform(markdown);

    const svg = document.getElementById('mindmap');
    const mm = Markmap.create(svg, {
      color: (node) => {
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
        return colors[node.depth % colors.length];
      },
      duration: 500,
      maxWidth: 300,
      paddingX: 20,
      autoFit: true,
      zoom: true,
      pan: true,
    }, root);

    // Auto-fit on load
    setTimeout(() => {
      mm.fit();
    }, 100);
  </script>
</body>
</html>
    `;

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
  }, [markdown]);

  return (
    <iframe
      ref={iframeRef}
      style={{
        width: '100%',
        height: '700px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#fff',
      }}
      title="Markmap Preview"
    />
  );
};

export const MindMapTab = ({ chapterId }: { chapterId: number }) => {
  const [mindMap, setMindMap] = useState<MindMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const [markdownContent, setMarkdownContent] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_active: true,
  });
  const notify = useNotify();

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

  const handleCreate = () => {
    setFormData({
      title: `Chapter ${chapterId} Mind Map`,
      description: 'Visual overview of key concepts',
      is_active: true,
    });
    setMarkdownContent(getDefaultMarkdown());
    setEditDialogOpen(true);
  };

  const handleEdit = () => {
    if (!mindMap) return;
    setFormData({
      title: mindMap.title,
      description: mindMap.description || '',
      is_active: mindMap.is_active,
    });
    setMarkdownContent(mindMap.markdown_content || getDefaultMarkdown());
    setEditDialogOpen(true);
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
            onClick={handleCreate}
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
              <Button variant="contained" startIcon={<EditIcon />} onClick={handleEdit} sx={{ borderRadius: 2 }}>
                Edit Mind Map
              </Button>
              <Button variant="outlined" onClick={handleToggleActive} sx={{ borderRadius: 2 }}>
                {mindMap.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </Stack>
          </Paper>
        </Stack>
      )}

      {/* Editor Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #eee' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <AccountTreeIcon color="primary" />
            <Typography variant="h6">{mindMap ? 'Edit' : 'Create'} Mind Map (Markmap)</Typography>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
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

            <Divider />

            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              <Tab icon={<CodeIcon />} label="Markdown Editor" />
              <Tab icon={<PreviewIcon />} label="Preview" />
            </Tabs>

            {activeTab === 0 && (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Markdown Syntax for Mindmap:
                  </Typography>
                  <Typography variant="caption" component="div">
                    • Use <code>#</code> for main topic, <code>##</code> for branches, <code>###</code> for sub-branches
                    <br />• Use <code>-</code> or <code>*</code> for bullet points
                    <br />• Indent with spaces to create hierarchy
                  </Typography>
                </Alert>
                <TextField
                  fullWidth
                  multiline
                  rows={20}
                  value={markdownContent}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                  placeholder="# Main Topic&#10;&#10;## Branch 1&#10;- Point 1&#10;- Point 2&#10;&#10;## Branch 2&#10;- Point 1"
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
          </Stack>
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid #eee', p: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!formData.title || !markdownContent}
            sx={{ borderRadius: 2 }}
          >
            {mindMap ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
