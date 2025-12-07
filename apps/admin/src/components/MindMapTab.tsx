import { useState, useEffect } from 'react';
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
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Divider,
  Stack,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import PreviewIcon from '@mui/icons-material/Preview';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface MindMapNode {
  id: string;
  parentId?: string;
  text: string;
  color?: string;
}

interface MindMap {
  id: number;
  chapterId: number;
  title: string;
  description?: string;
  structure: {
    version: string;
    layout: string;
    centerNode: {
      id: string;
      text: string;
      color?: string;
    };
    nodes: MindMapNode[];
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const COLORS = [
  { name: 'Ocean Blue', value: '#4A90E2', light: '#E3F2FD' },
  { name: 'Fresh Green', value: '#7ED321', light: '#F1F8E9' },
  { name: 'Warm Orange', value: '#F5A623', light: '#FFF3E0' },
  { name: 'Vibrant Red', value: '#D0021B', light: '#FFEBEE' },
  { name: 'Royal Purple', value: '#9013FE', light: '#F3E5F5' },
  { name: 'Aqua Teal', value: '#50E3C2', light: '#E0F2F1' },
  { name: 'Hot Pink', value: '#E91E63', light: '#FCE4EC' },
  { name: 'Amber', value: '#FF9800', light: '#FFF8E1' },
];

const LAYOUTS = [
  { value: 'radial', label: 'Radial', icon: '⭕', description: 'Nodes radiate from center' },
  { value: 'tree', label: 'Tree', icon: '🌳', description: 'Hierarchical tree structure' },
  { value: 'org-chart', label: 'Org Chart', icon: '📊', description: 'Organizational hierarchy' },
];

// Simple tree visualization component
const MindMapPreview = ({ centerNode, nodes, layout }: { centerNode: any; nodes: MindMapNode[]; layout: string }) => {
  const renderNode = (node: any, level: number = 0, parentColor?: string) => {
    const children = nodes.filter((n) => n.parentId === node.id);
    const color = node.color || parentColor || '#4A90E2';

    return (
      <Box key={node.id} sx={{ ml: level * 3, my: 0.5 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: 2,
            py: 1,
            borderRadius: 3,
            bgcolor: color,
            color: 'white',
            fontWeight: level === 0 ? 600 : 400,
            fontSize: level === 0 ? '1.1rem' : '0.9rem',
            boxShadow: level === 0 ? 3 : 1,
            border: '2px solid',
            borderColor: level === 0 ? 'rgba(255,255,255,0.3)' : 'transparent',
          }}
        >
          {node.text || '(Empty)'}
        </Box>
        {children.map((child) => renderNode(child, level + 1, color))}
      </Box>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        bgcolor: '#f8f9fa',
        borderRadius: 2,
        border: '2px dashed #ddd',
        minHeight: 400,
        maxHeight: 500,
        overflow: 'auto',
      }}
    >
      <Stack spacing={1} alignItems="flex-start">
        <Chip label={`Layout: ${layout}`} size="small" color="primary" variant="outlined" />
        {renderNode({ id: 'root', ...centerNode }, 0)}
      </Stack>
    </Paper>
  );
};

export const MindMapTab = ({ chapterId }: { chapterId: number }) => {
  const [mindMap, setMindMap] = useState<MindMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [centerNode, setCenterNode] = useState({ text: '', color: '#4A90E2' });
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [layout, setLayout] = useState('radial');

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

  const initializeEditor = (structure: any) => {
    setCenterNode({
      text: structure.centerNode.text,
      color: structure.centerNode.color || '#4A90E2',
    });
    setNodes(structure.nodes || []);
    setLayout(structure.layout || 'radial');
  };

  const handleCreate = () => {
    const defaultStructure = getDefaultStructure();
    setFormData({
      title: `Chapter ${chapterId} Mind Map`,
      description: 'Visual overview of key concepts',
      is_active: true,
    });
    initializeEditor(defaultStructure);
    setValidationErrors([]);
    setEditDialogOpen(true);
  };

  const handleEdit = () => {
    if (!mindMap) return;
    setFormData({
      title: mindMap.title,
      description: mindMap.description || '',
      is_active: mindMap.is_active,
    });
    initializeEditor(mindMap.structure);
    setValidationErrors([]);
    setEditDialogOpen(true);
  };

  const buildStructure = () => {
    return {
      version: '1.0',
      layout,
      centerNode: {
        id: 'root',
        text: centerNode.text,
        color: centerNode.color,
      },
      nodes: nodes.map((node) => ({
        id: node.id,
        parentId: node.parentId || 'root',
        text: node.text,
        color: node.color,
      })),
      connections: [],
      theme: {
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
        lineColor: '#666666',
        backgroundColor: '#FFFFFF',
      },
    };
  };

  const handleValidate = async () => {
    try {
      const structure = buildStructure();
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/admin/chapters/${chapterId}/mindmap/validate`,
        { structure },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.valid) {
        setValidationErrors([]);
        notify('✓ Structure is valid!', { type: 'success' });
      } else {
        setValidationErrors(response.data.errors || []);
        notify('Structure has errors', { type: 'warning' });
      }
    } catch (error: any) {
      setValidationErrors([error.response?.data?.message || 'Validation error']);
    }
  };

  const handleSave = async () => {
    try {
      const structure = buildStructure();
      const token = localStorage.getItem('token');

      if (mindMap) {
        await axios.put(
          `${API_URL}/admin/chapters/${chapterId}/mindmap`,
          { ...formData, structure },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        notify('✓ Mind map updated!', { type: 'success' });
      } else {
        await axios.post(
          `${API_URL}/admin/chapters/${chapterId}/mindmap`,
          { ...formData, structure },
          { headers: { Authorization: `Bearer ${token}` } },
        );
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

  const addNode = () => {
    const newId = `node${Date.now()}`;
    setNodes([...nodes, { id: newId, parentId: 'root', text: 'New Concept', color: '#7ED321' }]);
  };

  const updateNode = (index: number, field: keyof MindMapNode, value: string) => {
    const newNodes = [...nodes];
    newNodes[index] = { ...newNodes[index], [field]: value };
    setNodes(newNodes);
  };

  const removeNode = (index: number) => {
    const nodeToRemove = nodes[index];
    // Also remove children of this node
    const filteredNodes = nodes.filter((n, i) => i !== index && n.parentId !== nodeToRemove.id);
    setNodes(filteredNodes);
  };

  const getDefaultStructure = () => ({
    version: '1.0',
    layout: 'radial',
    centerNode: {
      id: 'root',
      text: `Chapter ${chapterId} Main Topic`,
      color: '#4A90E2',
    },
    nodes: [
      { id: 'node1', parentId: 'root', text: 'Key Concept 1', color: '#7ED321' },
      { id: 'node2', parentId: 'root', text: 'Key Concept 2', color: '#F5A623' },
    ],
    connections: [],
    theme: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 14,
      lineColor: '#666666',
      backgroundColor: '#FFFFFF',
    },
  });

  const getAvailableParents = () => {
    return [
      { id: 'root', text: centerNode.text || 'Center Node' },
      ...nodes.map((n) => ({ id: n.id, text: n.text || n.id })),
    ];
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
            Create a visual mind map to help users understand chapter concepts
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
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <Typography variant="h5" gutterBottom>
                  {mindMap.title}
                </Typography>
                {mindMap.description && <Typography color="textSecondary">{mindMap.description}</Typography>}
              </Grid>
              <Grid item>
                <Chip
                  icon={mindMap.is_active ? <VisibilityIcon /> : <VisibilityOffIcon />}
                  label={mindMap.is_active ? 'Active' : 'Inactive'}
                  color={mindMap.is_active ? 'success' : 'default'}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={3}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                  <Typography variant="h4" color="primary">
                    {mindMap.structure.layout}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Layout
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                  <Typography variant="h4" color="primary">
                    {mindMap.structure.nodes.length + 1}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Total Nodes
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                  <Typography variant="h4" color="primary">
                    {new Date(mindMap.updated_at).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Last Updated
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
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
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #eee' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <AccountTreeIcon color="primary" />
            <Typography variant="h6">{mindMap ? 'Edit' : 'Create'} Mind Map</Typography>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Grid container sx={{ height: '100%' }}>
            {/* Left Panel - Editor */}
            <Grid item xs={6} sx={{ p: 3, borderRight: '1px solid #eee', overflow: 'auto' }}>
              <Stack spacing={2.5}>
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

                {/* Layout Selection */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                    Layout Style
                  </Typography>
                  <Grid container spacing={1}>
                    {LAYOUTS.map((l) => (
                      <Grid item xs={4} key={l.value}>
                        <Tooltip title={l.description}>
                          <Card
                            variant="outlined"
                            onClick={() => setLayout(l.value)}
                            sx={{
                              cursor: 'pointer',
                              border: layout === l.value ? '2px solid' : '1px solid',
                              borderColor: layout === l.value ? 'primary.main' : 'divider',
                              bgcolor: layout === l.value ? 'primary.50' : 'transparent',
                              textAlign: 'center',
                              p: 1.5,
                              transition: 'all 0.2s',
                              '&:hover': { borderColor: 'primary.main' },
                            }}
                          >
                            <Typography variant="h4">{l.icon}</Typography>
                            <Typography variant="caption">{l.label}</Typography>
                          </Card>
                        </Tooltip>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                {/* Center Node */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                    🎯 Center Topic
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      <TextField
                        label="Main Topic"
                        fullWidth
                        value={centerNode.text}
                        onChange={(e) => setCenterNode({ ...centerNode, text: e.target.value })}
                        size="small"
                      />
                      <FormControl fullWidth size="small">
                        <InputLabel>Color</InputLabel>
                        <Select
                          value={centerNode.color}
                          label="Color"
                          onChange={(e) => setCenterNode({ ...centerNode, color: e.target.value })}
                        >
                          {COLORS.map((c) => (
                            <MenuItem key={c.value} value={c.value}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Box sx={{ width: 24, height: 24, bgcolor: c.value, borderRadius: 1 }} />
                                <Typography>{c.name}</Typography>
                              </Stack>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  </Card>
                </Box>

                {/* Child Nodes */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      📌 Sub-Topics ({nodes.length})
                    </Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={addNode}
                      variant="outlined"
                      size="small"
                      sx={{ borderRadius: 2 }}
                    >
                      Add Node
                    </Button>
                  </Stack>

                  {nodes.length === 0 ? (
                    <Alert severity="info" icon={<PreviewIcon />}>
                      Click "Add Node" to create sub-topics
                    </Alert>
                  ) : (
                    <Stack spacing={1.5}>
                      {nodes.map((node, index) => (
                        <Card key={node.id} variant="outlined" sx={{ p: 2 }}>
                          <Grid container spacing={1.5} alignItems="center">
                            <Grid item xs={12} sm={5}>
                              <TextField
                                label="Topic"
                                fullWidth
                                size="small"
                                value={node.text}
                                onChange={(e) => updateNode(index, 'text', e.target.value)}
                              />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Parent</InputLabel>
                                <Select
                                  value={node.parentId || 'root'}
                                  label="Parent"
                                  onChange={(e) => updateNode(index, 'parentId', e.target.value)}
                                >
                                  {getAvailableParents()
                                    .filter((p) => p.id !== node.id)
                                    .map((p) => (
                                      <MenuItem key={p.id} value={p.id}>
                                        {p.text}
                                      </MenuItem>
                                    ))}
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={10} sm={3}>
                              <FormControl fullWidth size="small">
                                <Select
                                  value={node.color || '#7ED321'}
                                  onChange={(e) => updateNode(index, 'color', e.target.value)}
                                  renderValue={(value) => (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Box sx={{ width: 20, height: 20, bgcolor: value, borderRadius: 1 }} />
                                      Color
                                    </Box>
                                  )}
                                >
                                  {COLORS.map((c) => (
                                    <MenuItem key={c.value} value={c.value}>
                                      <Stack direction="row" alignItems="center" spacing={1}>
                                        <Box sx={{ width: 20, height: 20, bgcolor: c.value, borderRadius: 1 }} />
                                        <Typography variant="body2">{c.name}</Typography>
                                      </Stack>
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={2} sm={1}>
                              <IconButton onClick={() => removeNode(index)} color="error" size="small">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Grid>
                          </Grid>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </Box>

                {validationErrors.length > 0 && (
                  <Alert severity="error">
                    <Typography variant="subtitle2" gutterBottom>
                      Validation Errors:
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {validationErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
              </Stack>
            </Grid>

            {/* Right Panel - Preview */}
            <Grid item xs={6} sx={{ p: 3, bgcolor: '#fafafa', overflow: 'auto' }}>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PreviewIcon color="action" />
                  <Typography variant="h6" color="textSecondary">
                    Live Preview
                  </Typography>
                </Stack>
                <MindMapPreview centerNode={centerNode} nodes={nodes} layout={layout} />
                <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                  ℹ️ This is a simplified preview. The actual mind map will be rendered with full interactivity for
                  users.
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid #eee', p: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleValidate} variant="outlined" sx={{ borderRadius: 2 }}>
            Validate
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!centerNode.text || validationErrors.length > 0}
            sx={{ borderRadius: 2 }}
          >
            {mindMap ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
