// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid, // Changed from Unstable_Grid2 as Grid
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
  InputAdornment,
} from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import axios from 'axios';

interface QuizConfig {
  id: number;
  chapter_id: number;
  title: string;
  description: string;
  questions_per_quiz: number;
  time_limit_minutes: number;
  passing_score_percentage: number;
  easy_percentage: number;
  medium_percentage: number;
  hard_percentage: number;
  is_active: boolean;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_results_immediately: boolean;
  max_attempts: number;
}

interface QuizConfigTabProps {
  chapterId: number;
}

export const QuizConfigTab: React.FC<QuizConfigTabProps> = ({ chapterId }) => {
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [chapterId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/chapters/${chapterId}/quiz-config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfig(response.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        // Config doesn't exist, create default
        await createDefaultConfig();
      } else {
        setError(err.response?.data?.message || 'Failed to load quiz configuration');
      }
    } finally {
      setLoading(false);
    }
  };

  const createDefaultConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/chapters/${chapterId}/quiz-config/default`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setConfig(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create default configuration');
    }
  };

  const handleSave = async () => {
    if (!config) return;

    // Validate difficulty percentages
    const total = config.easy_percentage + config.medium_percentage + config.hard_percentage;
    if (total !== 100) {
      setError(`Tổng phần trăm độ khó phải bằng 100%. Hiện tại: ${total}%`);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      const token = localStorage.getItem('token');

      const updateData = {
        title: config.title,
        description: config.description,
        questions_per_quiz: config.questions_per_quiz,
        time_limit_minutes: config.time_limit_minutes,
        passing_score_percentage: config.passing_score_percentage,
        easy_percentage: config.easy_percentage,
        medium_percentage: config.medium_percentage,
        hard_percentage: config.hard_percentage,
        is_active: config.is_active,
        shuffle_questions: config.shuffle_questions,
        shuffle_options: config.shuffle_options,
        show_results_immediately: config.show_results_immediately,
        max_attempts: config.max_attempts,
      };

      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL}/admin/chapters/${chapterId}/quiz-config`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setConfig(response.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof QuizConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!config) {
    return (
      <Alert severity="error">
        Không thể tải cấu hình quiz. Vui lòng thử lại.
        <Button onClick={loadConfig} startIcon={<RefreshIcon />} sx={{ ml: 2 }}>
          Thử lại
        </Button>
      </Alert>
    );
  }

  const difficultyTotal = config.easy_percentage + config.medium_percentage + config.hard_percentage;

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Đã lưu cấu hình thành công!
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Cấu hình Quiz
          </Typography>

          <Grid container spacing={3}>
            {/* Basic Settings */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tiêu đề Quiz"
                value={config.title}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            </Grid>

            <Grid xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Mô tả"
                value={config.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </Grid>

            <Divider sx={{ width: '100%', my: 2 }} />

            {/* Quiz Parameters */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Số câu hỏi mỗi quiz"
                value={config.questions_per_quiz}
                onChange={(e) => handleChange('questions_per_quiz', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 50 }}
                helperText="Số câu hỏi sẽ được chọn ngẫu nhiên"
              />
            </Grid>

            <Grid xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Thời gian làm bài (phút)"
                value={config.time_limit_minutes}
                onChange={(e) => handleChange('time_limit_minutes', parseInt(e.target.value))}
                inputProps={{ min: 0 }}
                helperText="0 = không giới hạn thời gian"
              />
            </Grid>

            <Grid xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Điểm đạt (%)"
                value={config.passing_score_percentage}
                onChange={(e) => handleChange('passing_score_percentage', parseInt(e.target.value))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                inputProps={{ min: 0, max: 100 }}
                helperText="Điểm tối thiểu để đạt quiz"
              />
            </Grid>

            <Divider sx={{ width: '100%', my: 2 }} />

            {/* Difficulty Distribution */}
            <Grid xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Phân bố độ khó câu hỏi
              </Typography>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Tổng phải bằng 100%. Hiện tại: {difficultyTotal}%
                {difficultyTotal !== 100 && (
                  <Typography component="span" color="error" sx={{ ml: 1 }}>
                    ⚠️ Không hợp lệ
                  </Typography>
                )}
              </Typography>
            </Grid>

            <Grid xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Câu dễ (%)"
                value={config.easy_percentage}
                onChange={(e) => handleChange('easy_percentage', parseInt(e.target.value))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                inputProps={{ min: 0, max: 100 }}
                error={difficultyTotal !== 100}
              />
            </Grid>

            <Grid xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Câu trung bình (%)"
                value={config.medium_percentage}
                onChange={(e) => handleChange('medium_percentage', parseInt(e.target.value))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                inputProps={{ min: 0, max: 100 }}
                error={difficultyTotal !== 100}
              />
            </Grid>

            <Grid xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Câu khó (%)"
                value={config.hard_percentage}
                onChange={(e) => handleChange('hard_percentage', parseInt(e.target.value))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                inputProps={{ min: 0, max: 100 }}
                error={difficultyTotal !== 100}
              />
            </Grid>

            <Divider sx={{ width: '100%', my: 2 }} />

            {/* Options */}
            <Grid xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Tùy chọn
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch checked={config.is_active} onChange={(e) => handleChange('is_active', e.target.checked)} />
                }
                label="Kích hoạt quiz"
              />
            </Grid>

            <Grid xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.shuffle_questions}
                    onChange={(e) => handleChange('shuffle_questions', e.target.checked)}
                  />
                }
                label="Xáo trộn câu hỏi"
              />
            </Grid>

            <Grid xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.shuffle_options}
                    onChange={(e) => handleChange('shuffle_options', e.target.checked)}
                  />
                }
                label="Xáo trộn đáp án"
              />
            </Grid>

            <Grid xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.show_results_immediately}
                    onChange={(e) => handleChange('show_results_immediately', e.target.checked)}
                  />
                }
                label="Hiển thị kết quả ngay lập tức"
              />
            </Grid>

            <Grid xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Số lần làm tối đa"
                value={config.max_attempts}
                onChange={(e) => handleChange('max_attempts', parseInt(e.target.value))}
                inputProps={{ min: 0 }}
                helperText="0 = không giới hạn"
              />
            </Grid>

            {/* Save Button */}
            <Grid xs={12}>
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button variant="outlined" onClick={loadConfig} startIcon={<RefreshIcon />} disabled={saving}>
                  Làm mới
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  startIcon={<SaveIcon />}
                  disabled={saving || difficultyTotal !== 100}
                >
                  {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};
