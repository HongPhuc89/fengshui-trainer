import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Box,
  Typography,
  Input,
} from '@mui/material';
import { useNotify } from 'react-admin';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ImportFlashcardsDialogProps {
  open: boolean;
  onClose: () => void;
  bookId: number;
  chapterId: number;
  onSuccess: () => void;
}

export const ImportFlashcardsDialog: React.FC<ImportFlashcardsDialogProps> = ({
  open,
  onClose,
  bookId,
  chapterId,
  onSuccess,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [skipErrors, setSkipErrors] = useState(true);
  const notify = useNotify();

  const steps = ['Upload File', 'Preview & Validate', 'Import'];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/admin/books/${bookId}/chapters/${chapterId}/flashcards/import/preview`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      setPreview(response.data);
      setActiveStep(1);
    } catch (error) {
      notify('Error previewing file', { type: 'error' });
      console.error(error);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('skipDuplicates', String(skipDuplicates));
    formData.append('skipErrors', String(skipErrors));

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/admin/books/${bookId}/chapters/${chapterId}/flashcards/import`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      notify(`Successfully imported ${response.data.imported} flashcards`, {
        type: 'success',
      });
      onSuccess();
      handleClose();
    } catch (error) {
      notify('Error importing flashcards', { type: 'error' });
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setFile(null);
    setPreview(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Flashcards</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3, mt: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && (
          <Box>
            <Input type="file" inputProps={{ accept: '.csv' }} onChange={handleFileChange} sx={{ mb: 2 }} />
            {file && (
              <Typography variant="body2" color="textSecondary">
                Selected: {file.name}
              </Typography>
            )}
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>CSV Format:</strong>
                <br />
                • Two columns: question, answer
                <br />
                • UTF-8 encoding
                <br />
                • Max 500 chars for question
                <br />• Max 1000 chars for answer
              </Typography>
            </Alert>
          </Box>
        )}

        {activeStep === 1 && preview && (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Valid: {preview.validRows} flashcards
            </Alert>
            {preview.warnings.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Warnings: {preview.warnings.length} (duplicates)
              </Alert>
            )}
            {preview.errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Errors: {preview.errors.length}
              </Alert>
            )}

            <Typography variant="h6" sx={{ mb: 2 }}>
              Preview (first 10 rows)
            </Typography>
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {preview.preview.map((row: any) => (
                <ListItem key={row.row}>
                  <ListItemText primary={row.question} secondary={row.answer} />
                </ListItem>
              ))}
            </List>

            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={<Checkbox checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />}
                label="Skip duplicate questions"
              />
              <FormControlLabel
                control={<Checkbox checked={skipErrors} onChange={(e) => setSkipErrors(e.target.checked)} />}
                label="Skip rows with errors"
              />
            </Box>
          </Box>
        )}

        {importing && <LinearProgress />}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {activeStep === 0 && (
          <Button onClick={handlePreview} disabled={!file} variant="contained">
            Next
          </Button>
        )}
        {activeStep === 1 && (
          <Button onClick={handleImport} disabled={importing || preview?.validRows === 0} variant="contained">
            Import {preview?.validRows} Cards
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
