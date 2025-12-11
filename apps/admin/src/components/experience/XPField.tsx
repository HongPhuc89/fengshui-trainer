import { NumberField } from 'react-admin';

interface XPFieldProps {
  source: string;
  label?: string;
}

export const XPField: React.FC<XPFieldProps> = ({ source, label = 'XP' }) => (
  <NumberField
    source={source}
    label={label}
    sx={(record: any) => ({
      color: record[source] > 0 ? 'success.main' : 'error.main',
      fontWeight: 'bold',
    })}
  />
);
