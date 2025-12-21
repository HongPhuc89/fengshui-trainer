import { ChapterLayout } from '../../layouts/ChapterLayout';
import { useParams } from 'react-router-dom';
import { FlashcardsTab } from '../../components/FlashcardsTab';
import { useState, useEffect } from 'react';
import { useNotify } from 'react-admin';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const ChapterFlashcardsPage = () => {
  const { bookId, chapterId } = useParams<{ bookId: string; chapterId: string }>();
  const notify = useNotify();
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchFlashcards();
  }, [bookId, chapterId]);

  const fetchFlashcards = async (pageNum: number = page) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/books/${bookId}/chapters/${chapterId}/flashcards`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: pageNum, limit: 20 },
      });
      setFlashcards(response.data.data || []);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.totalPages || 0);
      setPage(pageNum);
    } catch (error) {
      notify('Error fetching flashcards', { type: 'error' });
    }
  };

  return (
    <ChapterLayout>
      <FlashcardsTab
        bookId={Number(bookId)}
        chapterId={Number(chapterId)}
        flashcards={flashcards}
        total={total}
        page={page}
        totalPages={totalPages}
        onRefresh={fetchFlashcards}
        onPageChange={fetchFlashcards}
      />
    </ChapterLayout>
  );
};
