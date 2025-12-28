import {
  Create,
  SimpleForm,
  TextInput,
  required,
  email,
  SelectInput,
  PasswordInput,
  useGetIdentity,
} from 'react-admin';
import type { UserRole } from '../../types/user-role';

export const UserCreate = () => {
  const { data: identity } = useGetIdentity();
  const userRole = identity?.role as UserRole;

  // Admin can only create STAFF users
  // Staff can only create NORMAL_USER
  const getRoleChoices = () => {
    if (userRole === 'ADMIN') {
      return [
        { id: 'STAFF', name: 'Staff' },
        { id: 'NORMAL_USER', name: 'User' },
      ];
    } else if (userRole === 'STAFF') {
      return [{ id: 'NORMAL_USER', name: 'User' }];
    }
    return [];
  };

  return (
    <Create>
      <SimpleForm>
        <TextInput source="full_name" label="Full Name" validate={[required()]} fullWidth />
        <TextInput source="email" validate={[required(), email()]} fullWidth />
        <PasswordInput source="password" validate={[required()]} fullWidth />
        <SelectInput source="role" choices={getRoleChoices()} validate={[required()]} defaultValue="NORMAL_USER" />
      </SimpleForm>
    </Create>
  );
};
