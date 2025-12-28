import { ChapterLayout } from '../../layouts/ChapterLayout';
import { useParams } from 'react-router-dom';
import { ChapterInfoTab } from '../../components/ChapterInfoTab';
import { useState, useEffect } from 'react';
import { useNotify } from 'react-admin';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const ChapterDetailsPage = () => {
  const { bookId, chapterId } = useParams<{ bookId: string; chapterId: string }>();
  const notify = useNotify();
  const [chapter, setChapter] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <ChapterLayout>
        <div>Loading...</div>
      </ChapterLayout>
    );

  return (
    <ChapterLayout>
      <ChapterInfoTab chapter={chapter} />
    </ChapterLayout>
  );
};
