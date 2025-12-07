import { Show, SimpleShowLayout, TextField, EmailField, DateField } from 'react-admin';

export const UserShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="full_name" label="Name" />
      <EmailField source="email" />
      <TextField source="role" />
      <DateField source="created_at" label="Created At" />
      <DateField source="updated_at" label="Updated At" />
    </SimpleShowLayout>
  </Show>
);
