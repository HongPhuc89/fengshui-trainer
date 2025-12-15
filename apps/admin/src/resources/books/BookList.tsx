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
      <ImageField
        source="cover_file.path"
        label="Cover"
        sx={{ '& img': { maxWidth: 50, maxHeight: 75, objectFit: 'cover' } }}
      />
      <TextField source="title" />
      <TextField source="author" />
      <TextField source="status" />
      <DateField source="created_at" label="Created At" />
      <EditButton />
      <ShowButton />
    </Datagrid>
  </List>
);
