import { Edit, SimpleForm, TextInput, required, email, SelectInput } from 'react-admin';

export const UserEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="id" disabled />
      <TextInput source="full_name" label="Name" validate={[required()]} />
      <TextInput source="email" validate={[required(), email()]} />
      <SelectInput
        source="role"
        choices={[
          { id: 'ADMIN', name: 'Admin' },
          { id: 'NORMAL_USER', name: 'User' },
          { id: 'STAFF', name: 'Staff' },
        ]}
        validate={[required()]}
      />
    </SimpleForm>
  </Edit>
);
