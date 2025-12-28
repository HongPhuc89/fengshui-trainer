import { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button as MuiButton,
  IconButton,
  TextField,
  Typography,
  Pagination,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import { useNotify } from 'react-admin';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Flashcard {
  id: number;
  chapter_id: number;
  question: string;
  answer: string;
  created_at: string;
}

interface FlashcardsTabProps {
  bookId: number;
  chapterId: number;
  flashcards: Flashcard[];
  total: number;
  page: number;
  totalPages: number;
  onRefresh: () => void;
  onPageChange: (page: number) => void;
}

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({
  bookId,
  chapterId,
  flashcards,
  total: _total,
  page,
  totalPages,
  onRefresh,
  onPageChange,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const notify = useNotify();

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('skipDuplicates', 'true');
    formData.append('skipErrors', 'true');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/admin/books/${bookId}/chapters/${chapterId}/flashcards/import`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      notify(`Successfully imported ${response.data.imported} flashcards`, { type: 'success' });
      onRefresh();
    } catch (error) {
      notify('Error importing flashcards', { type: 'error' });
      console.error(error);
    }

    event.target.value = '';
  };

  const handleDeleteFlashcard = async (id: number) => {
    if (!window.confirm('Delete this flashcard?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/admin/flashcards/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      notify('Flashcard deleted', { type: 'success' });
      onRefresh();
    } catch (error) {
      notify('Error deleting flashcard', { type: 'error' });
    }
  };

  const handleEditFlashcard = (card: Flashcard) => {
    setEditingId(card.id);
    setEditQuestion(card.question);
    setEditAnswer(card.answer);
  };

  const handleSaveFlashcard = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/admin/books/${bookId}/chapters/${chapterId}/flashcards/${id}`,
        {
          question: editQuestion,
          answer: editAnswer,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      notify('Flashcard updated', { type: 'success' });
      setEditingId(null);
      onRefresh();
    } catch (error) {
      notify('Error updating flashcard', { type: 'error' });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditQuestion('');
    setEditAnswer('');
  };

  const handleCreateFlashcard = async () => {
    const question = prompt('Enter question:');
    if (!question) return;

    const answer = prompt('Enter answer:');
    if (!answer) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/admin/books/${bookId}/chapters/${chapterId}/flashcards`,
        { question, answer },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      notify('Flashcard created', { type: 'success' });
      onRefresh();
    } catch (error) {
      notify('Error creating flashcard', { type: 'error' });
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/books/${bookId}/chapters/${chapterId}/flashcards/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `chapter-${chapterId}-flashcards.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      notify('Flashcards exported successfully', { type: 'success' });
    } catch (error) {
      notify('Error exporting flashcards', { type: 'error' });
      console.error(error);
    }
  };

  return (
    <>
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <MuiButton variant="contained" startIcon={<AddIcon />} onClick={handleCreateFlashcard}>
          Add New Flashcard
        </MuiButton>
        <MuiButton variant="outlined" component="label" startIcon={<UploadIcon />}>
          Import CSV
          <input type="file" accept=".csv" hidden onChange={handleImportCSV} />
        </MuiButton>
        <MuiButton variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
          Export CSV
        </MuiButton>
      </Box>

      {flashcards.length === 0 ? (
        <Typography color="textSecondary">No flashcards yet. Generate them using AI or import from CSV.</Typography>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Question</TableCell>
                <TableCell>Answer</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flashcards.map((card) => {
                const isEditing = editingId === card.id;
                return (
                  <TableRow key={card.id}>
                    <TableCell>{card.id}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          fullWidth
                          multiline
                          value={editQuestion}
                          onChange={(e) => setEditQuestion(e.target.value)}
                          size="small"
                        />
                      ) : (
                        card.question
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          fullWidth
                          multiline
                          value={editAnswer}
                          onChange={(e) => setEditAnswer(e.target.value)}
                          size="small"
                        />
                      ) : (
                        card.answer
                      )}
                    </TableCell>
                    <TableCell>{new Date(card.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <>
                          <IconButton size="small" onClick={() => handleSaveFlashcard(card.id)} color="primary">
                            <SaveIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={handleCancelEdit}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </>
                      ) : (
                        <>
                          <IconButton size="small" onClick={() => handleEditFlashcard(card)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteFlashcard(card.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, newPage) => onPageChange(newPage)}
              color="primary"
            />
          </Box>
        </>
      )}
    </>
  );
};
