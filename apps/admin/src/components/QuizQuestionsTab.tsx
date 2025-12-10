import { useState, useEffect } from 'react';
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
  Typography,
  Pagination,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { QuestionTableRow } from './quiz-question-forms/QuestionTableRow';
import { QuestionDialog } from './quiz-question-forms/QuestionDialog';
import { useQuestionForm } from './quiz-question-forms/useQuestionForm';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Question {
  id: number;
  question_type: string;
  difficulty: string;
  question_text: string;
  points: number;
  options: any;
  explanation?: string;
  is_active: boolean;
  created_at: string;
}

interface QuizQuestionsTabProps {
  chapterId: number;
}

export const QuizQuestionsTab = ({ chapterId }: QuizQuestionsTabProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const { formData, setFormData, resetForm, loadQuestion, buildOptionsJson } = useQuestionForm();
  const notify = useNotify();

  useEffect(() => {
    fetchQuestions(page);
  }, [chapterId, page]);

  const fetchQuestions = async (pageNum: number = page) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/chapters/${chapterId}/questions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: pageNum,
          limit: 20,
        },
      });

      // Check if response has pagination
      if (response.data.data) {
        setQuestions(response.data.data);
        setTotal(response.data.total || 0);
        setTotalPages(response.data.totalPages || 0);
        setPage(pageNum);
      } else {
        // Fallback for non-paginated response
        setQuestions(response.data);
        setTotal(response.data.length);
        setTotalPages(1);
      }
    } catch (error) {
      notify('Error loading questions', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem('token');
      const options = buildOptionsJson();

      await axios.post(
        `${API_URL}/admin/chapters/${chapterId}/questions`,
        {
          question_type: formData.question_type,
          difficulty: formData.difficulty,
          question_text: formData.question_text,
          points: formData.points,
          options,
          explanation: formData.explanation || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      notify('Question created successfully', { type: 'success' });
      setCreateDialogOpen(false);
      resetForm();
      fetchQuestions(1);
    } catch (error) {
      notify('Error creating question', { type: 'error' });
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    loadQuestion(question);
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingQuestion) return;

    try {
      const token = localStorage.getItem('token');
      const options = buildOptionsJson();

      await axios.patch(
        `${API_URL}/admin/chapters/${chapterId}/questions/${editingQuestion.id}`,
        {
          question_type: formData.question_type,
          difficulty: formData.difficulty,
          question_text: formData.question_text,
          points: formData.points,
          options,
          explanation: formData.explanation || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      notify('Question updated successfully', { type: 'success' });
      setEditDialogOpen(false);
      setEditingQuestion(null);
      resetForm();
      fetchQuestions(page);
    } catch (error) {
      notify('Error updating question', { type: 'error' });
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
      fetchQuestions(page);
    } catch (error) {
      notify('Error deleting question', { type: 'error' });
    }
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleCloseCreate = () => {
    setCreateDialogOpen(false);
    resetForm();
  };

  const handleCloseEdit = () => {
    setEditDialogOpen(false);
    setEditingQuestion(null);
    resetForm();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Quiz Questions ({total} total)</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
          Add Question
        </Button>
      </Box>

      {questions.length === 0 ? (
        <Typography color="textSecondary">No questions yet. Click "Add Question" to create one.</Typography>
      ) : (
        <>
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
                <QuestionTableRow key={q.id} question={q} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" />
            </Box>
          )}
        </>
      )}

      {/* Create Dialog */}
      <QuestionDialog
        open={createDialogOpen}
        title="Create New Question"
        formData={formData}
        setFormData={setFormData}
        onClose={handleCloseCreate}
        onSubmit={handleCreate}
        submitLabel="Create"
      />

      {/* Edit Dialog */}
      <QuestionDialog
        open={editDialogOpen}
        title="Edit Question"
        formData={formData}
        setFormData={setFormData}
        onClose={handleCloseEdit}
        onSubmit={handleUpdate}
        submitLabel="Update"
      />
    </Box>
  );
};
