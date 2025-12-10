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
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel>Difficulty</InputLabel>
        <Select
          value={formData.difficulty}
          label="Difficulty"
          onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
        >
          <MenuItem value="EASY">Easy</MenuItem>
          <MenuItem value="MEDIUM">Medium</MenuItem>
          <MenuItem value="HARD">Hard</MenuItem>
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
