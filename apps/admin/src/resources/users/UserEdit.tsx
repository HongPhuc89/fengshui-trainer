import { Edit, SimpleForm, TextInput, required, email, SelectInput } from 'react-admin';

export const UserEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="id" disabled />
      <TextInput source="name" validate={[required()]} />
      <TextInput source="email" validate={[required(), email()]} />
      <SelectInput
        source="role"
        choices={[
          { id: 'Admin', name: 'Admin' },
          { id: 'User', name: 'User' },
        ]}
        validate={[required()]}
      />
    </SimpleForm>
  </Edit>
);
