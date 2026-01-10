import {
  List,
  Datagrid,
  TextField,
  DateField,
  EditButton,
  ShowButton,
  CreateButton,
  TopToolbar,
  FunctionField,
} from 'react-admin';
import { getAuthenticatedMediaUrl } from '../../utils/mediaUrl';

const BookListActions = () => (
  <TopToolbar>
    <CreateButton />
  </TopToolbar>
);

export const BookList = () => (
  <List actions={<BookListActions />}>
    <Datagrid>
      <TextField source="id" />
      <FunctionField
        label="Cover"
        render={(record: any) => (
          <img
            src={getAuthenticatedMediaUrl(record.cover_file?.path)}
            alt={record.title}
            style={{ maxWidth: 50, maxHeight: 75, objectFit: 'cover' }}
          />
        )}
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
