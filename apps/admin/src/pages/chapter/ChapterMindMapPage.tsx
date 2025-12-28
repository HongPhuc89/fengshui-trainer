import { ChapterLayout } from '../../layouts/ChapterLayout';
import { useParams } from 'react-router-dom';
import { MindMapTab } from '../../components/MindMapTab';

export const ChapterMindMapPage = () => {
  const { chapterId } = useParams<{ chapterId: string }>();

  return (
    <ChapterLayout>
      <MindMapTab chapterId={Number(chapterId)} />
    </ChapterLayout>
  );
};
