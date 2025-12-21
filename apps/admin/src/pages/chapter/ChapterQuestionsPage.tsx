import { ChapterLayout } from '../../layouts/ChapterLayout';
import { useParams } from 'react-router-dom';
import { QuizQuestionsTab } from '../../components/QuizQuestionsTab';

export const ChapterQuestionsPage = () => {
  const { chapterId } = useParams<{ chapterId: string }>();

  return (
    <ChapterLayout>
      <QuizQuestionsTab chapterId={Number(chapterId)} />
    </ChapterLayout>
  );
};
