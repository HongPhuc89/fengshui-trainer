import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loading, useNotify } from 'react-admin';
import axios from 'axios';
import { Card, CardContent, Typography, Tabs, Tab, Box, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { QuizQuestionsTab } from '../components/QuizQuestionsTab';
import { MindMapTab } from '../components/MindMapTab';
import { FlashcardsTab } from '../components/FlashcardsTab';
import { ChapterInfoTab } from '../components/ChapterInfoTab';

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
  question: string;
  answer: string;
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
          <ChapterInfoTab chapter={chapter} />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <FlashcardsTab
            bookId={Number(bookId)}
            chapterId={Number(chapterId)}
            flashcards={flashcards}
            onRefresh={fetchFlashcards}
          />
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
