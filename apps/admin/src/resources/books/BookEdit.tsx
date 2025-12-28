import { Edit, SimpleForm, TextInput, required, SelectInput } from 'react-admin';

export const BookEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="id" disabled />
      <TextInput source="title" validate={[required()]} fullWidth />
      <TextInput source="author" fullWidth />
      <TextInput source="language" />
      <TextInput source="description" multiline rows={5} fullWidth />
      <SelectInput
        source="status"
        choices={[
          { id: 'draft', name: 'Draft' },
          { id: 'published', name: 'Published' },
          { id: 'archived', name: 'Archived' },
        ]}
      />
    </SimpleForm>
  </Edit>
);
