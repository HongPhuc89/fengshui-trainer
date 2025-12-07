import { useState, useEffect, useRef } from 'react';
import { useNotify } from 'react-admin';
import axios from 'axios';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import AddIcon from '@mui/icons-material/Add';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Question {
  id: number;
  question_type: string;
  difficulty: string;
  question_text: string;
  points: number;
  is_active: boolean;
  created_at: string;
}

export const QuizQuestionsTab = ({ chapterId }: { chapterId: number }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notify = useNotify();

  useEffect(() => {
    fetchQuestions();
  }, [chapterId]);

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/chapters/${chapterId}/questions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuestions(response.data);
    } catch (error) {
      notify('Error loading questions', { type: 'error' });
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/chapters/${chapterId}/questions/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Download CSV file
      const blob = new Blob([response.data.content], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.data.filename;
      a.click();
      window.URL.revokeObjectURL(url);

      notify('Questions exported successfully', { type: 'success' });
    } catch (error) {
      notify('Error exporting questions', { type: 'error' });
      console.error('Error:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvContent(content);
        setImportDialogOpen(true);
      };
      reader.readAsText(file);
    }
  };

  const handleImportCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/admin/chapters/${chapterId}/questions/import/csv`,
        { csv_content: csvContent },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      notify(`Import completed: ${response.data.success} questions added`, { type: 'success' });

      if (response.data.errors.length > 0) {
        console.warn('Import errors:', response.data.errors);
        notify(`${response.data.errors.length} errors occurred. Check console for details.`, { type: 'warning' });
      }

      setImportDialogOpen(false);
      setCsvContent('');
      fetchQuestions();
    } catch (error) {
      notify('Error importing questions', { type: 'error' });
      console.error('Error:', error);
    }
  };

  const handleDelete = async (questionId: number) => {
    if (!window.confirm('Delete this question?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/admin/chapters/${chapterId}/questions/${questionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      notify('Question deleted', { type: 'success' });
      fetchQuestions();
    } catch (error) {
      notify('Error deleting question', { type: 'error' });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'success';
      case 'MEDIUM':
        return 'warning';
      case 'HARD':
        return 'error';
      default:
        return 'default';
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ');
  };

  if (loading) return <Typography>Loading questions...</Typography>;

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => notify('Create question form - TODO', { type: 'info' })}
        >
          Add Question
        </Button>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCSV}>
          Export CSV
        </Button>
        <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => fileInputRef.current?.click()}>
          Import CSV
        </Button>
        <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileSelect} />
      </Box>

      {questions.length === 0 ? (
        <Typography color="textSecondary">No questions yet. Add questions or import from CSV.</Typography>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Question</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Difficulty</TableCell>
              <TableCell>Points</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {questions.map((q) => (
              <TableRow key={q.id}>
                <TableCell>{q.id}</TableCell>
                <TableCell sx={{ maxWidth: 300 }}>{q.question_text}</TableCell>
                <TableCell>
                  <Chip label={getQuestionTypeLabel(q.question_type)} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={q.difficulty} size="small" color={getDifficultyColor(q.difficulty)} />
                </TableCell>
                <TableCell>{q.points}</TableCell>
                <TableCell>{new Date(q.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleDelete(q.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Import CSV Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Questions from CSV</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            CSV should have columns: question_type, difficulty, question_text, points, options (JSON), explanation
          </Typography>
          <TextField
            multiline
            rows={10}
            fullWidth
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            variant="outlined"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleImportCSV} variant="contained">
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
