import { ChapterLayout } from '../../layouts/ChapterLayout';
import { useParams } from 'react-router-dom';
import { QuizConfigTab } from '../../components/QuizConfigTab';

export const ChapterConfigPage = () => {
  const { chapterId } = useParams<{ chapterId: string }>();

  return (
    <ChapterLayout>
      <QuizConfigTab chapterId={Number(chapterId)} />
    </ChapterLayout>
  );
};
