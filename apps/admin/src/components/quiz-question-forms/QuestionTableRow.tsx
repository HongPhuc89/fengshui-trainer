import { TableRow, TableCell, Chip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

interface Question {
  id: number;
  question_type: string;
  difficulty: string;
  question_text: string;
  points: number;
  options: any;
  is_active: boolean;
  created_at: string;
}

interface QuestionTableRowProps {
  question: Question;
  onEdit: (question: Question) => void;
  onDelete: (id: number) => void;
}

export const QuestionTableRow = ({ question, onEdit, onDelete }: QuestionTableRowProps) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'success';
      case 'MEDIUM':
        return 'warning';
      case 'HARD':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <TableRow>
      <TableCell>{question.id}</TableCell>
      <TableCell sx={{ maxWidth: 300 }}>{question.question_text}</TableCell>
      <TableCell>
        <Chip label={question.question_type.replace(/_/g, ' ')} size="small" />
      </TableCell>
      <TableCell>
        <Chip label={question.difficulty} size="small" color={getDifficultyColor(question.difficulty)} />
      </TableCell>
      <TableCell>{question.points}</TableCell>
      <TableCell>{new Date(question.created_at).toLocaleDateString()}</TableCell>
      <TableCell>
        <IconButton size="small" onClick={() => onEdit(question)} color="primary">
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => onDelete(question.id)} color="error">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
};
