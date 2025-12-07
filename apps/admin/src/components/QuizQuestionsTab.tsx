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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  FormGroup,
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [formData, setFormData] = useState({
    question_type: 'MULTIPLE_CHOICE',
    difficulty: 'EASY',
    question_text: '',
    points: 2,
    explanation: '',
    // For MULTIPLE_CHOICE & MULTIPLE_ANSWER
    options: [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ],
    correctAnswer: 'a', // For MULTIPLE_CHOICE
    correctAnswers: [] as string[], // For MULTIPLE_ANSWER
    // For TRUE_FALSE
    trueFalseAnswer: true,
    // For MATCHING
    matchingPairs: [
      { id: 1, left: '', right: '' },
      { id: 2, left: '', right: '' },
    ],
    // For ORDERING
    orderingItems: [
      { id: 'a', text: '', correct_order: 1 },
      { id: 'b', text: '', correct_order: 2 },
    ],
  });
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
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCsvContent(e.target?.result as string);
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
        { headers: { Authorization: `Bearer ${token}` } },
      );

      notify(`Import completed: ${response.data.success} questions added`, { type: 'success' });
      if (response.data.errors.length > 0) {
        console.warn('Import errors:', response.data.errors);
      }

      setImportDialogOpen(false);
      setCsvContent('');
      fetchQuestions();
    } catch (error) {
      notify('Error importing questions', { type: 'error' });
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

  const buildOptionsJson = () => {
    switch (formData.question_type) {
      case 'TRUE_FALSE':
        return {
          correct_answer: formData.trueFalseAnswer,
          true_label: 'True',
          false_label: 'False',
        };
      case 'MULTIPLE_CHOICE':
        return {
          options: formData.options.filter((opt) => opt.text.trim()),
          correct_answer: formData.correctAnswer,
        };
      case 'MULTIPLE_ANSWER':
        return {
          options: formData.options.filter((opt) => opt.text.trim()),
          correct_answers: formData.correctAnswers,
        };
      case 'MATCHING':
        return {
          pairs: formData.matchingPairs.filter((pair) => pair.left.trim() && pair.right.trim()),
        };
      case 'ORDERING':
        return {
          items: formData.orderingItems.filter((item) => item.text.trim()),
        };
      default:
        return {};
    }
  };

  const handleCreateQuestion = async () => {
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
      fetchQuestions();
    } catch (error) {
      notify('Error creating question', { type: 'error' });
    }
  };

  const resetForm = () => {
    setFormData({
      question_type: 'MULTIPLE_CHOICE',
      difficulty: 'EASY',
      question_text: '',
      points: 2,
      explanation: '',
      options: [
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
        { id: 'd', text: '' },
      ],
      correctAnswer: 'a',
      correctAnswers: [],
      trueFalseAnswer: true,
      matchingPairs: [
        { id: 1, left: '', right: '' },
        { id: 2, left: '', right: '' },
      ],
      orderingItems: [
        { id: 'a', text: '', correct_order: 1 },
        { id: 'b', text: '', correct_order: 2 },
      ],
    });
  };

  const updateOption = (index: number, text: string) => {
    const newOptions = [...formData.options];
    newOptions[index].text = text;
    setFormData({ ...formData, options: newOptions });
  };

  const toggleCorrectAnswer = (id: string) => {
    const newCorrectAnswers = formData.correctAnswers.includes(id)
      ? formData.correctAnswers.filter((a) => a !== id)
      : [...formData.correctAnswers, id];
    setFormData({ ...formData, correctAnswers: newCorrectAnswers });
  };

  if (loading) return <Typography>Loading questions...</Typography>;

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
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
                  <Chip label={q.question_type.replace(/_/g, ' ')} size="small" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={q.difficulty}
                    size="small"
                    color={q.difficulty === 'EASY' ? 'success' : q.difficulty === 'MEDIUM' ? 'warning' : 'error'}
                  />
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
          <TextField
            multiline
            rows={10}
            fullWidth
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
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

      {/* Create Question Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Question</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Question Type</InputLabel>
              <Select
                value={formData.question_type}
                label="Question Type"
                onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
              >
                <MenuItem value="TRUE_FALSE">True/False</MenuItem>
                <MenuItem value="MULTIPLE_CHOICE">Multiple Choice</MenuItem>
                <MenuItem value="MULTIPLE_ANSWER">Multiple Answer</MenuItem>
                <MenuItem value="MATCHING">Matching</MenuItem>
                <MenuItem value="ORDERING">Ordering</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={formData.difficulty}
                label="Difficulty"
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
              >
                <MenuItem value="EASY">Easy (2 points)</MenuItem>
                <MenuItem value="MEDIUM">Medium (4 points)</MenuItem>
                <MenuItem value="HARD">Hard (5 points)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Question Text"
              multiline
              rows={3}
              fullWidth
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
            />

            <TextField
              label="Points"
              type="number"
              fullWidth
              value={formData.points}
              onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
            />

            {/* TRUE_FALSE Options */}
            {formData.question_type === 'TRUE_FALSE' && (
              <FormControl>
                <Typography variant="subtitle2" gutterBottom>
                  Correct Answer:
                </Typography>
                <RadioGroup
                  value={formData.trueFalseAnswer}
                  onChange={(e) => setFormData({ ...formData, trueFalseAnswer: e.target.value === 'true' })}
                >
                  <FormControlLabel value={true} control={<Radio />} label="True" />
                  <FormControlLabel value={false} control={<Radio />} label="False" />
                </RadioGroup>
              </FormControl>
            )}

            {/* MULTIPLE_CHOICE Options */}
            {formData.question_type === 'MULTIPLE_CHOICE' && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Options:
                </Typography>
                {formData.options.map((opt, idx) => (
                  <Box key={opt.id} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      label={`Option ${opt.id.toUpperCase()}`}
                      fullWidth
                      value={opt.text}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      size="small"
                    />
                    <FormControlLabel
                      control={
                        <Radio
                          checked={formData.correctAnswer === opt.id}
                          onChange={() => setFormData({ ...formData, correctAnswer: opt.id })}
                        />
                      }
                      label="Correct"
                    />
                  </Box>
                ))}
              </Box>
            )}

            {/* MULTIPLE_ANSWER Options */}
            {formData.question_type === 'MULTIPLE_ANSWER' && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Options (select all correct answers):
                </Typography>
                <FormGroup>
                  {formData.options.map((opt, idx) => (
                    <Box key={opt.id} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField
                        label={`Option ${opt.id.toUpperCase()}`}
                        fullWidth
                        value={opt.text}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        size="small"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.correctAnswers.includes(opt.id)}
                            onChange={() => toggleCorrectAnswer(opt.id)}
                          />
                        }
                        label="Correct"
                      />
                    </Box>
                  ))}
                </FormGroup>
              </Box>
            )}

            <TextField
              label="Explanation (Optional)"
              multiline
              rows={2}
              fullWidth
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateQuestion} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
