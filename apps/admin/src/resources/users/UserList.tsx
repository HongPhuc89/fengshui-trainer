import { List, Datagrid, TextField, EmailField, DateField, EditButton, ShowButton } from 'react-admin';

export const UserList = () => (
  <List>
    <Datagrid>
      <TextField source="id" />
      <TextField source="name" />
      <EmailField source="email" />
      <TextField source="role" />
      <DateField source="created_at" label="Created At" />
      <EditButton />
      <ShowButton />
    </Datagrid>
  </List>
);
