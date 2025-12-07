import { Admin, Resource, CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';
import { authProvider } from './providers/authProvider';
import { dataProvider } from './providers/dataProvider';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';

// User Resources
import { UserList } from './resources/users/UserList';
import { UserShow } from './resources/users/UserShow';
import { UserEdit } from './resources/users/UserEdit';
import { UserCreate } from './resources/users/UserCreate';

// Book Resources
import { BookList } from './resources/books/BookList';
import { BookShow } from './resources/books/BookShow';
import { BookEdit } from './resources/books/BookEdit';

// Pages
import { ChapterDetailPage } from './pages/ChapterDetailPage';

function App() {
  return (
    <Admin dataProvider={dataProvider} authProvider={authProvider} title="Quiz Game Admin">
      <Resource name="users" list={UserList} show={UserShow} edit={UserEdit} create={UserCreate} icon={PeopleIcon} />
      <Resource name="books" list={BookList} show={BookShow} edit={BookEdit} icon={MenuBookIcon} />
      <CustomRoutes>
        <Route path="/chapters/:bookId/:chapterId" element={<ChapterDetailPage />} />
      </CustomRoutes>
    </Admin>
  );
}

export default App;
