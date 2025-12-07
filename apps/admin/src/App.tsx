import { Admin, Resource, ListGuesser, EditGuesser } from 'react-admin';
import { authProvider } from './providers/authProvider';
import { dataProvider } from './providers/dataProvider';

// User Resources
import { UserList } from './resources/users/UserList';
import { UserShow } from './resources/users/UserShow';
import { UserEdit } from './resources/users/UserEdit';

// Book Resources
import { BookList } from './resources/books/BookList';
import { BookShow } from './resources/books/BookShow';
import { BookEdit } from './resources/books/BookEdit';

function App() {
  return (
    <Admin dataProvider={dataProvider} authProvider={authProvider} title="Quiz Game Admin">
      <Resource name="users" list={UserList} show={UserShow} edit={UserEdit} />
      <Resource name="books" list={BookList} show={BookShow} edit={BookEdit} />
      <Resource name="chapters" list={ListGuesser} edit={EditGuesser} />
      <Resource name="flashcards" list={ListGuesser} edit={EditGuesser} />
    </Admin>
  );
}

export default App;
