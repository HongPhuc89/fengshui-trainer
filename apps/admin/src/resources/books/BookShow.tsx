import { Show, SimpleShowLayout, TextField, DateField, ImageField, RichTextField } from 'react-admin';

export const BookShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="title" />
      <TextField source="author" />
      <TextField source="language" />
      <ImageField source="cover_url" label="Cover" />
      <RichTextField source="description" />
      <TextField source="status" />
      <DateField source="created_at" label="Created At" />
      <DateField source="updated_at" label="Updated At" />
    </SimpleShowLayout>
  </Show>
);
