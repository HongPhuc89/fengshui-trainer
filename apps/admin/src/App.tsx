import { Admin, Resource, CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';
import { authProvider } from './providers/authProvider';
import { dataProvider } from './providers/dataProvider';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TimelineIcon from '@mui/icons-material/Timeline';

// User Resources
import { UserList } from './resources/users/UserList';
import { UserShow } from './resources/users/UserShow';
import { UserEdit } from './resources/users/UserEdit';
import { UserCreate } from './resources/users/UserCreate';

// Book Resources
import { BookList } from './resources/books/BookList';
import { BookShow } from './resources/books/BookShow';
import { BookEdit } from './resources/books/BookEdit';

// Experience Resources
import { ExperienceLogList, LevelList, LevelEdit } from './resources/experience';

// Chapter Pages
import {
  ChapterDetailsPage,
  ChapterFlashcardsPage,
  ChapterQuestionsPage,
  ChapterConfigPage,
  ChapterMindMapPage,
} from './pages/chapter';

function App() {
  return (
    <Admin dataProvider={dataProvider} authProvider={authProvider} title="Quiz Game Admin">
      <Resource name="users" list={UserList} show={UserShow} edit={UserEdit} create={UserCreate} icon={PeopleIcon} />
      <Resource name="books" list={BookList} show={BookShow} edit={BookEdit} icon={MenuBookIcon} />
      <Resource
        name="experience-logs"
        options={{ label: 'XP Logs' }}
        list={ExperienceLogList}
        icon={TimelineIcon}
        recordRepresentation="id"
      />
      <Resource
        name="levels"
        options={{ label: 'Cultivation Ranks' }}
        list={LevelList}
        edit={LevelEdit}
        icon={EmojiEventsIcon}
        recordRepresentation="title"
      />
      <CustomRoutes>
        {/* Chapter Routes */}
        <Route path="/chapters/:bookId/:chapterId" element={<ChapterDetailsPage />} />
        <Route path="/chapters/:bookId/:chapterId/flashcards" element={<ChapterFlashcardsPage />} />
        <Route path="/chapters/:bookId/:chapterId/questions" element={<ChapterQuestionsPage />} />
        <Route path="/chapters/:bookId/:chapterId/config" element={<ChapterConfigPage />} />
        <Route path="/chapters/:bookId/:chapterId/mindmap" element={<ChapterMindMapPage />} />
      </CustomRoutes>
    </Admin>
  );
}

export default App;
