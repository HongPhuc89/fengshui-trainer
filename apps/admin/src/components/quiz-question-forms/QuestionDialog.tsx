import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { QuestionFormFields } from './QuestionFormFields';

interface QuestionDialogProps {
  open: boolean;
  title: string;
  formData: any;
  setFormData: (data: any) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel?: string;
}

export const QuestionDialog = ({
  open,
  title,
  formData,
  setFormData,
  onClose,
  onSubmit,
  submitLabel = 'Save',
}: QuestionDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <QuestionFormFields formData={formData} setFormData={setFormData} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit} variant="contained">
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
