import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loading, useNotify } from 'react-admin';
import axios from 'axios';
import {
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button as MuiButton,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import { QuizQuestionsTab } from '../components/QuizQuestionsTab';
import { MindMapTab } from '../components/MindMapTab';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Chapter {
  id: number;
  book_id: number;
  title: string;
  content: string;
  order: number;
  points: number;
  created_at: string;
  updated_at: string;
}

interface Flashcard {
  id: number;
  chapter_id: number;
  front: string;
  back: string;
  created_at: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

export const ChapterDetailPage = () => {
  const { bookId, chapterId } = useParams<{ bookId: string; chapterId: string }>();
  const navigate = useNavigate();
  const notify = useNotify();

  const [loading, setLoading] = useState(true);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchChapter();
    fetchFlashcards();
  }, [bookId, chapterId]);

  const fetchChapter = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/books/${bookId}/chapters/${chapterId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChapter(response.data);
    } catch (error) {
      notify('Error loading chapter', { type: 'error' });
      console.error('Error fetching chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlashcards = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/flashcards/chapter/${chapterId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFlashcards(response.data);
    } catch (error) {
      console.error('Error fetching flashcards:', error);
    }
  };

  const handleGenerateFlashcards = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/admin/flashcards/generate`,
        { chapterId: Number(chapterId) },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      notify('Flashcards generation started', { type: 'success' });
      // Refresh after a delay
      setTimeout(() => fetchFlashcards(), 3000);
    } catch (error) {
      notify('Error generating flashcards', { type: 'error' });
      console.error('Error:', error);
    }
  };

  const handleDeleteFlashcard = async (id: number) => {
    if (!window.confirm('Delete this flashcard?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/admin/flashcards/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      notify('Flashcard deleted', { type: 'success' });
      fetchFlashcards();
    } catch (error) {
      notify('Error deleting flashcard', { type: 'error' });
    }
  };

  if (loading) return <Loading />;
  if (!chapter) return <div>Chapter not found</div>;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate(`/#/books/${bookId}/show/chapters`)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ ml: 2 }}>
            {chapter.title}
          </Typography>
        </Box>

        <Tabs value={tabValue} onChange={(_e, v) => setTabValue(v)}>
          <Tab label="Chapter Details" />
          <Tab label="Flashcards" />
          <Tab label="Quiz Questions" />
          <Tab label="Mind Map" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div>
              <Typography variant="subtitle2" color="textSecondary">
                ID
              </Typography>
              <Typography>{chapter.id}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="textSecondary">
                Title
              </Typography>
              <Typography>{chapter.title}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="textSecondary">
                Order
              </Typography>
              <Typography>{chapter.order}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="textSecondary">
                Points
              </Typography>
              <Typography>{chapter.points}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="textSecondary">
                Content
              </Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{chapter.content}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="textSecondary">
                Created
              </Typography>
              <Typography>{new Date(chapter.created_at).toLocaleString()}</Typography>
            </div>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2 }}>
            <MuiButton variant="contained" onClick={handleGenerateFlashcards}>
              Generate Flashcards with AI
            </MuiButton>
          </Box>

          {flashcards.length === 0 ? (
            <Typography color="textSecondary">No flashcards yet. Generate them using AI.</Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Front (Question)</TableCell>
                  <TableCell>Back (Answer)</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {flashcards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell>{card.id}</TableCell>
                    <TableCell>{card.front}</TableCell>
                    <TableCell>{card.back}</TableCell>
                    <TableCell>{new Date(card.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleDeleteFlashcard(card.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <QuizQuestionsTab chapterId={Number(chapterId)} />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <MindMapTab chapterId={Number(chapterId)} />
        </TabPanel>
      </CardContent>
    </Card>
  );
};
