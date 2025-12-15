import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Show,
  TextField,
  DateField,
  NumberField,
  TabbedShowLayout,
  Tab,
  useRecordContext,
  Loading,
  Button,
  useNotify,
  Labeled,
} from 'react-admin';
import axios from 'axios';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as MuiButton,
  TextField as MuiTextField,
  Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Chapter {
  id: number;
  title: string;
  order: number;
  points: number;
  content: string;
  created_at: string;
  book_id: number;
}

interface ChapterFormData {
  title: string;
  order: string;
  points: string;
  content: string;
}

const CreateChapterButton = ({ bookId, onSuccess }: { bookId: number; onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ChapterFormData>({
    title: '',
    order: '',
    points: '100',
    content: '',
  });
  const notify = useNotify();

  const handleOpen = async () => {
    // Fetch current chapters to calculate next order
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/books/${bookId}/chapters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const chapters = response.data as Chapter[];
      const nextOrder = chapters.length + 1;

      setFormData({
        title: `Chương ${nextOrder}`,
        order: String(nextOrder),
        points: '100',
        content: '',
      });
    } catch (error) {
      // If fetch fails, use defaults
      setFormData({
        title: 'Chương 1',
        order: '1',
        points: '100',
        content: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({ title: '', order: '', points: '100', content: '' });
  };

  const handleChange = (field: keyof ChapterFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      notify('Chapter title is required', { type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        title: formData.title,
        content: formData.content || '',
        points: formData.points ? Number(formData.points) : 100,
      };

      if (formData.order) {
        payload.order = Number(formData.order);
      }

      await axios.post(`${API_URL}/admin/books/${bookId}/chapters`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      notify('Chapter created successfully', { type: 'success' });
      handleClose();
      onSuccess();
    } catch (error) {
      notify('Error creating chapter', { type: 'error' });
      console.error('Error creating chapter:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button label="Add Chapter" onClick={handleOpen} startIcon={<AddIcon />} />
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Create New Chapter</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <MuiTextField
              label="Chapter Title *"
              fullWidth
              value={formData.title}
              onChange={handleChange('title')}
              autoFocus
            />
            <MuiTextField
              label="Order"
              type="number"
              fullWidth
              value={formData.order}
              onChange={handleChange('order')}
              helperText="Leave empty for auto-ordering"
            />
            <MuiTextField
              label="Points"
              type="number"
              fullWidth
              value={formData.points}
              onChange={handleChange('points')}
            />
            <MuiTextField
              label="Content"
              multiline
              rows={8}
              fullWidth
              value={formData.content}
              onChange={handleChange('content')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={handleClose}>Cancel</MuiButton>
          <MuiButton onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Creating...' : 'Create'}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

const EditChapterButton = ({
  bookId,
  chapter,
  onSuccess,
}: {
  bookId: number;
  chapter: Chapter;
  onSuccess: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ChapterFormData>({
    title: chapter.title,
    order: String(chapter.order),
    points: String(chapter.points),
    content: chapter.content || '',
  });
  const notify = useNotify();

  const handleOpen = () => setOpen(true);

  const handleClose = () => {
    setOpen(false);
    // Reset to original values
    setFormData({
      title: chapter.title,
      order: String(chapter.order),
      points: String(chapter.points),
      content: chapter.content || '',
    });
  };

  const handleChange = (field: keyof ChapterFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      notify('Chapter title is required', { type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        title: formData.title,
        content: formData.content || '',
        points: formData.points ? Number(formData.points) : 100,
        order: formData.order ? Number(formData.order) : chapter.order,
      };

      await axios.put(`${API_URL}/admin/books/${bookId}/chapters/${chapter.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      notify('Chapter updated successfully', { type: 'success' });
      handleClose();
      onSuccess();
    } catch (error) {
      notify('Error updating chapter', { type: 'error' });
      console.error('Error updating chapter:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button label="Edit" onClick={handleOpen} startIcon={<EditIcon />} />
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Edit Chapter</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <MuiTextField
              label="Chapter Title *"
              fullWidth
              value={formData.title}
              onChange={handleChange('title')}
              autoFocus
            />
            <MuiTextField
              label="Order"
              type="number"
              fullWidth
              value={formData.order}
              onChange={handleChange('order')}
            />
            <MuiTextField
              label="Points"
              type="number"
              fullWidth
              value={formData.points}
              onChange={handleChange('points')}
            />
            <MuiTextField
              label="Content"
              multiline
              rows={8}
              fullWidth
              value={formData.content}
              onChange={handleChange('content')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={handleClose}>Cancel</MuiButton>
          <MuiButton onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

const ChaptersTab = () => {
  const record = useRecordContext();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const notify = useNotify();

  const fetchChapters = async () => {
    if (!record) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/books/${record.id}/chapters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChapters(response.data);
    } catch (error) {
      notify('Error loading chapters', { type: 'error' });
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapters();
  }, [record]);

  const handleDelete = async (chapter: Chapter) => {
    if (!record) return;
    if (!window.confirm(`Are you sure you want to delete chapter "${chapter.title}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/admin/books/${record.id}/chapters/${chapter.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      notify('Chapter deleted successfully', { type: 'success' });
      fetchChapters();
    } catch (error) {
      notify('Error deleting chapter', { type: 'error' });
      console.error('Error deleting chapter:', error);
    }
  };

  if (!record) return null;
  if (loading) return <Loading />;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <CreateChapterButton bookId={Number(record.id)} onSuccess={fetchChapters} />
      </div>
      {chapters.length === 0 ? (
        <div style={{ padding: 16, textAlign: 'center', color: '#666' }}>
          No chapters yet. Click "Add Chapter" to create one.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: 8, textAlign: 'left' }}>ID</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Title</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Order</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Points</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Created</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {chapters.map((chapter) => (
              <tr
                key={chapter.id}
                style={{
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/chapters/${record.id}/${chapter.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <td style={{ padding: 8 }}>{chapter.id}</td>
                <td style={{ padding: 8 }}>{chapter.title}</td>
                <td style={{ padding: 8 }}>{chapter.order}</td>
                <td style={{ padding: 8 }}>{chapter.points}</td>
                <td style={{ padding: 8 }}>{new Date(chapter.created_at).toLocaleDateString()}</td>
                <td style={{ padding: 8, display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                  <EditChapterButton bookId={Number(record.id)} chapter={chapter} onSuccess={fetchChapters} />
                  <Button label="Delete" onClick={() => handleDelete(chapter)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const BookDetailsTab = () => {
  const record = useRecordContext();
  const [uploading, setUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState(record?.cover_file?.path || '');
  const notify = useNotify();

  useEffect(() => {
    if (record?.cover_file?.path) {
      setCoverUrl(record.cover_file.path);
    }
  }, [record]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !record) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      notify('Please select an image file', { type: 'error' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notify('Image size must be less than 5MB', { type: 'error' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('cover', file);

      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/admin/books/${record.id}/cover`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setCoverUrl(response.data.cover_url);
      notify('Cover updated successfully', { type: 'success' });
      // Refresh the page to show updated cover
      window.location.reload();
    } catch (error: any) {
      notify(error.response?.data?.message || 'Error uploading cover', { type: 'error' });
      console.error('Error uploading cover:', error);
    } finally {
      setUploading(false);
    }
  };

  if (!record) return null;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 4, p: 2 }}>
      {/* Left Column - Book Details */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Labeled label="Tên sách">
          <TextField source="title" />
        </Labeled>
        <Labeled label="Tác giả">
          <TextField source="author" />
        </Labeled>
        <Labeled label="Trạng thái">
          <TextField source="status" />
        </Labeled>
        <Labeled label="Tổng số chương">
          <NumberField source="chapter_count" />
        </Labeled>
        <Labeled label="Ngày tạo">
          <DateField source="created_at" />
        </Labeled>
        <Labeled label="Ngày cập nhật">
          <DateField source="updated_at" />
        </Labeled>
      </Box>

      {/* Right Column - Cover Image */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          position: 'sticky',
          top: 20,
          height: 'fit-content',
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 300,
            aspectRatio: '2/3',
            border: '2px dashed #ccc',
            borderRadius: 2,
            overflow: 'hidden',
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={record.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <Box sx={{ textAlign: 'center', color: '#999', p: 2 }}>
              <AddIcon sx={{ fontSize: 48, mb: 1 }} />
              <Box>No cover image</Box>
            </Box>
          )}
        </Box>

        <MuiButton
          variant="contained"
          component="label"
          disabled={uploading}
          startIcon={uploading ? null : <AddIcon />}
          fullWidth
          sx={{ maxWidth: 300 }}
        >
          {uploading ? 'Uploading...' : coverUrl ? 'Change Cover' : 'Upload Cover'}
          <input type="file" hidden accept="image/*" onChange={handleFileChange} />
        </MuiButton>

        <Box sx={{ fontSize: 12, color: '#666', textAlign: 'center', maxWidth: 300 }}>
          Recommended: 400x600px, max 5MB
          <br />
          Supported formats: JPG, PNG, WebP
        </Box>
      </Box>
    </Box>
  );
};

export const BookShow = () => (
  <Show>
    <TabbedShowLayout>
      <Tab label="Book Details">
        <BookDetailsTab />
      </Tab>

      <Tab label="Chapters" path="chapters">
        <ChaptersTab />
      </Tab>
    </TabbedShowLayout>
  </Show>
);
