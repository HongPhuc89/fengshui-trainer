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
  Typography,
  Pagination,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TableSortLabel,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
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

type SortField = 'id' | 'question_type' | 'difficulty' | 'points' | 'created_at';
type SortOrder = 'asc' | 'desc';

export const QuizQuestionsTab = ({ chapterId }: QuizQuestionsTabProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');

  // Search, filter, and sort states
  const [searchInput, setSearchInput] = useState(''); // Input value
  const [searchQuery, setSearchQuery] = useState(''); // Actual search query for API
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Loading states for different operations
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [clearingDuplicates, setClearingDuplicates] = useState(false);
  const [cleaningQuestions, setCleaningQuestions] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { formData, setFormData, resetForm, loadQuestion, buildOptionsJson } = useQuestionForm();
  const notify = useNotify();

  useEffect(() => {
    fetchQuestions(page);
  }, [chapterId, page, searchQuery, typeFilter, sortField, sortOrder]);

  const handleSearchKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      setSearchQuery(searchInput);
      setPage(1); // Reset to first page on new search
    }
  };

  const fetchQuestions = async (pageNum: number = page) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/chapters/${chapterId}/questions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: pageNum,
          limit: 20,
          search: searchQuery || undefined,
          type: typeFilter || undefined,
          sortBy: sortField,
          sortOrder: sortOrder,
        },
      });

      // Check if response has pagination
      if (response.data.data) {
        setQuestions(response.data.data);
        setTotal(response.data.total || 0);
        setTotalPages(response.data.totalPages || 0);
        setPage(pageNum);
      } else {
        // Fallback for non-paginated response - apply client-side filtering and sorting
        let filtered = response.data;

        // Apply search
        if (searchQuery) {
          filtered = filtered.filter((q: Question) =>
            q.question_text.toLowerCase().includes(searchQuery.toLowerCase()),
          );
        }

        // Apply type filter
        if (typeFilter) {
          filtered = filtered.filter((q: Question) => q.question_type === typeFilter);
        }

        // Apply sorting
        filtered.sort((a: Question, b: Question) => {
          const aVal = a[sortField];
          const bVal = b[sortField];
          const modifier = sortOrder === 'asc' ? 1 : -1;
          return aVal > bVal ? modifier : aVal < bVal ? -modifier : 0;
        });

        setQuestions(filtered);
        setTotal(filtered.length);
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
      setCreating(true);
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
    } finally {
      setCreating(false);
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

  const handleExportCSV = async () => {
    try {
      setExporting(true);
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
    } finally {
      setExporting(false);
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
      setImporting(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/admin/chapters/${chapterId}/questions/import/csv`,
        { csv_content: csvContent },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      let message = `Import completed: ${response.data.success} questions added`;
      if (response.data.skipped > 0) {
        message += `, ${response.data.skipped} duplicates skipped`;
      }
      notify(message, { type: 'success' });

      if (response.data.errors.length > 0) {
        console.warn('Import errors:', response.data.errors);
      }

      setImportDialogOpen(false);
      setCsvContent('');
      fetchQuestions(1);
    } catch (error) {
      notify('Error importing questions', { type: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const handleCleanQuestions = async () => {
    if (
      !confirm('Clean all question texts in this chapter? This will remove prefixes before ":" and trim whitespace.')
    ) {
      return;
    }

    try {
      setCleaningQuestions(true);
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${API_URL}/admin/chapters/${chapterId}/questions/clean`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      notify(response.data.message, { type: 'success' });
      fetchQuestions();
    } catch (error) {
      notify('Error cleaning questions', { type: 'error' });
    } finally {
      setCleaningQuestions(false);
    }
  };

  const handleClearDuplicates = async () => {
    if (!window.confirm('Are you sure you want to remove all duplicate questions? This action cannot be undone.')) {
      return;
    }

    try {
      setClearingDuplicates(true);
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_URL}/admin/chapters/${chapterId}/questions/duplicates`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      notify(response.data.message, { type: 'success' });
      fetchQuestions(page);
    } catch (error) {
      notify('Error clearing duplicates', { type: 'error' });
    } finally {
      setClearingDuplicates(false);
    }
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={handleExportCSV}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            Import CSV
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={clearingDuplicates ? <CircularProgress size={16} /> : <DeleteSweepIcon />}
            onClick={handleClearDuplicates}
            disabled={clearingDuplicates}
          >
            {clearingDuplicates ? 'Clearing...' : 'Clear Duplicates'}
          </Button>
          <Button
            variant="outlined"
            color="info"
            startIcon={cleaningQuestions ? <CircularProgress size={16} /> : <DeleteSweepIcon />}
            onClick={handleCleanQuestions}
            disabled={cleaningQuestions}
          >
            {cleaningQuestions ? 'Cleaning...' : 'Clean Questions'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            disabled={creating}
          >
            Add Question
          </Button>
        </Box>
      </Box>
      <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileSelect} />

      {/* Search and Filter Bar */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search questions... (Press Enter to search)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyPress={handleSearchKeyPress}
          size="small"
          sx={{ flexGrow: 1, maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            label="Filter by Type"
            startAdornment={
              <InputAdornment position="start">
                <FilterListIcon fontSize="small" />
              </InputAdornment>
            }
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value="TRUE_FALSE">True/False</MenuItem>
            <MenuItem value="MULTIPLE_CHOICE">Multiple Choice</MenuItem>
            <MenuItem value="MULTIPLE_ANSWER">Multiple Answer</MenuItem>
            <MenuItem value="MATCHING">Matching</MenuItem>
            <MenuItem value="ORDERING">Ordering</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {questions.length === 0 ? (
        <Typography color="textSecondary">No questions yet. Click "Add Question" to create one.</Typography>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'id'}
                    direction={sortField === 'id' ? sortOrder : 'asc'}
                    onClick={() => handleSort('id')}
                  >
                    ID
                  </TableSortLabel>
                </TableCell>
                <TableCell>Question</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'question_type'}
                    direction={sortField === 'question_type' ? sortOrder : 'asc'}
                    onClick={() => handleSort('question_type')}
                  >
                    Type
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'difficulty'}
                    direction={sortField === 'difficulty' ? sortOrder : 'asc'}
                    onClick={() => handleSort('difficulty')}
                  >
                    Difficulty
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'points'}
                    direction={sortField === 'points' ? sortOrder : 'asc'}
                    onClick={() => handleSort('points')}
                  >
                    Points
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'created_at'}
                    direction={sortField === 'created_at' ? sortOrder : 'asc'}
                    onClick={() => handleSort('created_at')}
                  >
                    Created
                  </TableSortLabel>
                </TableCell>
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

      {/* Import CSV Dialog */}
      <Dialog open={importDialogOpen} onClose={() => !importing && setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Questions from CSV</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={10}
            fullWidth
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="Paste CSV content here or select a file..."
            disabled={importing}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)} disabled={importing}>
            Cancel
          </Button>
          <Button
            onClick={handleImportCSV}
            variant="contained"
            disabled={importing}
            startIcon={importing ? <CircularProgress size={16} /> : null}
          >
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
