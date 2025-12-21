import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Loading, useNotify } from 'react-admin';
import axios from 'axios';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoIcon from '@mui/icons-material/Info';
import StyleIcon from '@mui/icons-material/Style';
import QuizIcon from '@mui/icons-material/Quiz';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

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

export const ChapterLayout = ({ children }: { children: React.ReactNode }) => {
  const { bookId, chapterId } = useParams<{ bookId: string; chapterId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotify();

  const [loading, setLoading] = useState(true);
  const [chapter, setChapter] = useState<Chapter | null>(null);

  useEffect(() => {
    fetchChapter();
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

  const menuItems = [
    { label: 'Details', path: '', icon: <InfoIcon /> },
    { label: 'Flashcards', path: '/flashcards', icon: <StyleIcon /> },
    { label: 'Quiz Questions', path: '/questions', icon: <QuizIcon /> },
    { label: 'Quiz Config', path: '/config', icon: <SettingsIcon /> },
    { label: 'Mind Map', path: '/mindmap', icon: <AccountTreeIcon /> },
  ];

  const basePath = `/chapters/${bookId}/${chapterId}`;
  const currentPath = location.pathname.replace(`/#${basePath}`, '').replace(basePath, '');

  if (loading) return <Loading />;
  if (!chapter) return <div>Chapter not found</div>;

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      {/* Sidebar Navigation */}
      <Paper sx={{ width: 250, flexShrink: 0 }}>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton size="small" onClick={() => navigate(`/books/${bookId}/show/chapters`)}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="subtitle2" sx={{ ml: 1, fontWeight: 600 }}>
              Back to Book
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {chapter.title}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Chapter {chapter.order} • {chapter.points} points
          </Typography>
        </Box>

        <List>
          {menuItems.map((item) => {
            const itemPath = `${basePath}${item.path}`;
            const isActive = currentPath === item.path || (currentPath === '' && item.path === '');

            return (
              <ListItemButton
                key={item.path}
                selected={isActive}
                onClick={() => navigate(itemPath)}
                sx={{
                  borderLeft: isActive ? '4px solid' : '4px solid transparent',
                  borderColor: 'primary.main',
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          })}
        </List>
      </Paper>

      {/* Main Content */}
      <Card sx={{ flex: 1 }}>
        <CardContent>{children}</CardContent>
      </Card>
    </Box>
  );
};
