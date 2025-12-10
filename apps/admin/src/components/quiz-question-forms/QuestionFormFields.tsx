import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  FormGroup,
} from '@mui/material';
import { MatchingForm } from '../quiz-forms/MatchingForm';
import { OrderingForm } from '../quiz-forms/OrderingForm';

interface QuestionFormFieldsProps {
  formData: any;
  setFormData: (data: any) => void;
}

export const QuestionFormFields = ({ formData, setFormData }: QuestionFormFieldsProps) => {
  const updateOption = (index: number, text: string) => {
    const newOptions = [...formData.options];
    newOptions[index].text = text;
    setFormData({ ...formData, options: newOptions });
  };

  const toggleCorrectAnswer = (id: string) => {
    const newCorrectAnswers = formData.correctAnswers.includes(id)
      ? formData.correctAnswers.filter((a: string) => a !== id)
      : [...formData.correctAnswers, id];
    setFormData({ ...formData, correctAnswers: newCorrectAnswers });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      <FormControl fullWidth>
        <InputLabel>Question Type</InputLabel>
        <Select
          value={formData.question_type}
          label="Question Type"
          onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
        >
          <MenuItem value="TRUE_FALSE">True/False</MenuItem>
          <MenuItem value="MULTIPLE_CHOICE">Multiple Choice</MenuItem>
          <MenuItem value="MULTIPLE_ANSWER">Multiple Answer</MenuItem>
          <MenuItem value="MATCHING">Matching</MenuItem>
          <MenuItem value="ORDERING">Ordering</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel>Difficulty</InputLabel>
        <Select
          value={formData.difficulty}
          label="Difficulty"
          onChange={(e) => {
            const difficulty = e.target.value;
            let points = formData.points;

            // Auto-set points based on difficulty
            if (difficulty === 'EASY') {
              points = 2;
            } else if (difficulty === 'MEDIUM') {
              points = 3;
            } else if (difficulty === 'HARD') {
              points = 4.5;
            }

            setFormData({ ...formData, difficulty, points });
          }}
        >
          <MenuItem value="EASY">Easy (2 points)</MenuItem>
          <MenuItem value="MEDIUM">Medium (3 points)</MenuItem>
          <MenuItem value="HARD">Hard (4.5 points)</MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="Question Text"
        multiline
        rows={3}
        fullWidth
        value={formData.question_text}
        onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
      />

      <TextField
        label="Points"
        type="number"
        fullWidth
        value={formData.points}
        onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
        inputProps={{
          min: 1,
          max: 5,
          step: 0.5,
        }}
        helperText="Choose from 1 to 5 points (0.5 increments)"
      />

      {/* TRUE_FALSE Options */}
      {formData.question_type === 'TRUE_FALSE' && (
        <FormControl>
          <Typography variant="subtitle2" gutterBottom>
            Correct Answer:
          </Typography>
          <RadioGroup
            value={formData.trueFalseAnswer}
            onChange={(e) => setFormData({ ...formData, trueFalseAnswer: e.target.value === 'true' })}
          >
            <FormControlLabel value={true} control={<Radio />} label="True" />
            <FormControlLabel value={false} control={<Radio />} label="False" />
          </RadioGroup>
        </FormControl>
      )}

      {/* MULTIPLE_CHOICE Options */}
      {formData.question_type === 'MULTIPLE_CHOICE' && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Options:
          </Typography>
          {formData.options.map((opt: any, idx: number) => (
            <Box key={opt.id} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label={`Option ${opt.id.toUpperCase()}`}
                fullWidth
                value={opt.text}
                onChange={(e) => updateOption(idx, e.target.value)}
                size="small"
              />
              <FormControlLabel
                control={
                  <Radio
                    checked={formData.correctAnswer === opt.id}
                    onChange={() => setFormData({ ...formData, correctAnswer: opt.id })}
                  />
                }
                label="Correct"
              />
            </Box>
          ))}
        </Box>
      )}

      {/* MULTIPLE_ANSWER Options */}
      {formData.question_type === 'MULTIPLE_ANSWER' && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Options (select all correct answers):
          </Typography>
          <FormGroup>
            {formData.options.map((opt: any, idx: number) => (
              <Box key={opt.id} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  label={`Option ${opt.id.toUpperCase()}`}
                  fullWidth
                  value={opt.text}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  size="small"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.correctAnswers.includes(opt.id)}
                      onChange={() => toggleCorrectAnswer(opt.id)}
                    />
                  }
                  label="Correct"
                />
              </Box>
            ))}
          </FormGroup>
        </Box>
      )}

      {/* MATCHING Options */}
      {formData.question_type === 'MATCHING' && (
        <MatchingForm
          pairs={formData.matchingPairs}
          onUpdatePair={(index: number, field: 'left' | 'right', value: string) => {
            const newPairs = [...formData.matchingPairs];
            newPairs[index][field] = value;
            setFormData({ ...formData, matchingPairs: newPairs });
          }}
          onAddPair={() => {
            const newId = Math.max(...formData.matchingPairs.map((p: any) => p.id), 0) + 1;
            setFormData({
              ...formData,
              matchingPairs: [...formData.matchingPairs, { id: newId, left: '', right: '' }],
            });
          }}
          onRemovePair={(index: number) => {
            setFormData({
              ...formData,
              matchingPairs: formData.matchingPairs.filter((_: any, i: number) => i !== index),
            });
          }}
        />
      )}

      {/* ORDERING Options */}
      {formData.question_type === 'ORDERING' && (
        <OrderingForm
          items={formData.orderingItems}
          onUpdateItem={(index: number, text: string) => {
            const newItems = [...formData.orderingItems];
            newItems[index].text = text;
            setFormData({ ...formData, orderingItems: newItems });
          }}
          onAddItem={() => {
            const newId = String.fromCharCode(97 + formData.orderingItems.length);
            setFormData({
              ...formData,
              orderingItems: [
                ...formData.orderingItems,
                { id: newId, text: '', correct_order: formData.orderingItems.length + 1 },
              ],
            });
          }}
          onRemoveItem={(index: number) => {
            const filtered = formData.orderingItems.filter((_: any, i: number) => i !== index);
            const reordered = filtered.map((item: any, idx: number) => ({ ...item, correct_order: idx + 1 }));
            setFormData({ ...formData, orderingItems: reordered });
          }}
          onMoveUp={(index: number) => {
            if (index === 0) return;
            const newItems = [...formData.orderingItems];
            [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
            const reordered = newItems.map((item: any, idx: number) => ({ ...item, correct_order: idx + 1 }));
            setFormData({ ...formData, orderingItems: reordered });
          }}
          onMoveDown={(index: number) => {
            if (index === formData.orderingItems.length - 1) return;
            const newItems = [...formData.orderingItems];
            [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
            const reordered = newItems.map((item: any, idx: number) => ({ ...item, correct_order: idx + 1 }));
            setFormData({ ...formData, orderingItems: reordered });
          }}
        />
      )}

      <TextField
        label="Explanation (Optional)"
        multiline
        rows={2}
        fullWidth
        value={formData.explanation}
        onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
      />
    </Box>
  );
};
