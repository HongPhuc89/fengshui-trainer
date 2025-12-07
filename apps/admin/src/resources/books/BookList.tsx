import {
  List,
  Datagrid,
  TextField,
  DateField,
  EditButton,
  ShowButton,
  CreateButton,
  TopToolbar,
  ImageField,
} from 'react-admin';

const BookListActions = () => (
  <TopToolbar>
    <CreateButton />
  </TopToolbar>
);

export const BookList = () => (
  <List actions={<BookListActions />}>
    <Datagrid>
      <TextField source="id" />
      <TextField source="title" />
      <TextField source="author" />
      <TextField source="language" />
      <ImageField source="cover_url" label="Cover" />
      <TextField source="status" />
      <DateField source="created_at" label="Created At" />
      <EditButton />
      <ShowButton />
    </Datagrid>
  </List>
);
