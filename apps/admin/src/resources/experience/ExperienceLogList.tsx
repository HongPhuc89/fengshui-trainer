import { List, Datagrid, TextField, DateField, ReferenceField, FunctionField } from 'react-admin';
import { SourceTypeBadge, ExperienceLogFilters, XPField } from '../../components/experience';

export const ExperienceLogList = () => (
  <List sort={{ field: 'created_at', order: 'DESC' }} perPage={25} aside={<ExperienceLogFilters />} filters={[]}>
    <Datagrid bulkActionButtons={false}>
      <ReferenceField source="user_id" reference="users" link="show">
        <TextField source="email" />
      </ReferenceField>

      <FunctionField label="Source" render={(record: any) => <SourceTypeBadge sourceType={record.source_type} />} />

      <XPField source="xp" label="XP" />

      <TextField source="description" />

      <DateField source="created_at" showTime />
    </Datagrid>
  </List>
);
