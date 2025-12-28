# Active Context: 12 - Flashcard Import/Export Feature

## ✔️ Status

- **Current Status**: Design Phase
- **Last Updated**: 2025-12-09
- **Priority**: Medium

## ✏️ Business Requirements

### Overview

Allow administrators to import and export flashcards in bulk using CSV files. This feature will be available in the Chapter Detail page of the admin dashboard, enabling efficient flashcard management.

### User Stories

1. **As an admin**, I want to export all flashcards from a chapter to CSV so that I can backup or edit them externally.
2. **As an admin**, I want to import flashcards from a CSV file so that I can quickly add multiple flashcards at once.
3. **As an admin**, I want to see a preview of imported flashcards before saving so that I can verify the data is correct.
4. **As an admin**, I want to download a CSV template so that I know the correct format for importing.

## 📋 CSV Format Specification

### File Format

- **File Extension**: `.csv`
- **Encoding**: UTF-8 (with BOM for Excel compatibility)
- **Delimiter**: Comma (`,`)
- **Quote Character**: Double quote (`"`)
- **Line Ending**: LF (`\n`)

### CSV Structure

```csv
question,answer
"What is the capital of France?","Paris"
"What is 2 + 2?","4"
"Who wrote Romeo and Juliet?","William Shakespeare"
```

### Column Definitions

| Column     | Required | Type   | Max Length | Description            |
| ---------- | -------- | ------ | ---------- | ---------------------- |
| `question` | Yes      | String | 500 chars  | The flashcard question |
| `answer`   | Yes      | String | 1000 chars | The flashcard answer   |

### Validation Rules

1. **Required Fields**: Both `question` and `answer` must be present
2. **Empty Rows**: Skip empty rows
3. **Duplicates**: Check for duplicate questions within the same chapter
4. **Length Limits**:
   - Question: Max 500 characters
   - Answer: Max 1000 characters
5. **Special Characters**: Support Unicode characters, line breaks, and quotes

### Example CSV Files

#### Valid CSV

```csv
question,answer
"What is photosynthesis?","The process by which plants convert light energy into chemical energy"
"Define gravity","A force that attracts objects toward each other"
"What is DNA?","Deoxyribonucleic acid, the molecule that carries genetic information"
```

#### CSV with Multiline Answers

```csv
question,answer
"List the planets","Mercury
Venus
Earth
Mars
Jupiter
Saturn
Uranus
Neptune"
"What are the primary colors?","Red
Blue
Yellow"
```

#### CSV with Special Characters

```csv
question,answer
"What is the formula for water?","H₂O"
"Quote from Shakespeare","To be, or not to be, that is the question"
"Math equation","E = mc²"
```

## 🎨 UI/UX Design

### Chapter Detail Page - New Actions Section

```
┌─────────────────────────────────────────────────────┐
│ Chapter: Introduction to Physics                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Flashcards (25)                    [Import] [Export]│
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Q: What is gravity?                             │ │
│ │ A: A force that attracts objects...             │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Import Flow

#### Step 1: Upload Dialog

```
┌─────────────────────────────────────────────────────┐
│ Import Flashcards                              [×]  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  📄 Upload CSV File                                 │
│  ┌─────────────────────────────────────────────┐   │
│  │  Drag and drop CSV file here                │   │
│  │  or                                          │   │
│  │  [Choose File]                               │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ℹ️ CSV Format:                                     │
│  • Two columns: question, answer                    │
│  • UTF-8 encoding                                   │
│  • Max 500 chars for question                       │
│  • Max 1000 chars for answer                        │
│                                                      │
│  [Download Template]                                │
│                                                      │
│                              [Cancel]  [Next]       │
└─────────────────────────────────────────────────────┘
```

#### Step 2: Preview & Validation

```
┌─────────────────────────────────────────────────────┐
│ Preview Import (15 flashcards)                 [×]  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ✅ Valid: 12 flashcards                            │
│  ⚠️  Warnings: 2 flashcards                         │
│  ❌ Errors: 1 flashcard                             │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ ✅ Row 1                                     │   │
│  │ Q: What is gravity?                          │   │
│  │ A: A force that attracts...                  │   │
│  ├─────────────────────────────────────────────┤   │
│  │ ⚠️  Row 2 - Duplicate question               │   │
│  │ Q: What is gravity? (already exists)         │   │
│  │ A: Different answer...                       │   │
│  │ [Skip] [Replace] [Keep Both]                 │   │
│  ├─────────────────────────────────────────────┤   │
│  │ ❌ Row 3 - Missing answer                    │   │
│  │ Q: What is photosynthesis?                   │   │
│  │ A: (empty)                                   │   │
│  │ This row will be skipped                     │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ☑️ Skip rows with errors                           │
│  ☑️ Skip duplicate questions                        │
│                                                      │
│                    [Cancel]  [Import 12 Cards]      │
└─────────────────────────────────────────────────────┘
```

#### Step 3: Import Progress

```
┌─────────────────────────────────────────────────────┐
│ Importing Flashcards...                        [×]  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Importing 12 flashcards...                         │
│                                                      │
│  ████████████████░░░░░░░░░░ 60% (7/12)             │
│                                                      │
│  ✓ Imported: What is gravity?                       │
│  ✓ Imported: Define photosynthesis                  │
│  ⏳ Importing: What is DNA?                         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### Step 4: Success Summary

```
┌─────────────────────────────────────────────────────┐
│ Import Complete                                [×]  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ✅ Successfully imported 12 flashcards             │
│                                                      │
│  Summary:                                           │
│  • Total rows: 15                                   │
│  • Imported: 12                                     │
│  • Skipped (duplicates): 2                          │
│  • Skipped (errors): 1                              │
│                                                      │
│                                        [Done]       │
└─────────────────────────────────────────────────────┘
```

### Export Flow

#### Export Dialog

```
┌─────────────────────────────────────────────────────┐
│ Export Flashcards                              [×]  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Export 25 flashcards from:                         │
│  "Chapter 1: Introduction to Physics"               │
│                                                      │
│  File Format:                                       │
│  ◉ CSV (Comma-separated values)                     │
│  ○ Excel (.xlsx)                                    │
│  ○ JSON                                             │
│                                                      │
│  Options:                                           │
│  ☑️ Include chapter name in filename                │
│  ☑️ Add timestamp to filename                       │
│  ☐ Include metadata (created_at, updated_at)        │
│                                                      │
│  Preview filename:                                  │
│  chapter-1-flashcards-2025-12-09.csv                │
│                                                      │
│                              [Cancel]  [Export]     │
└─────────────────────────────────────────────────────┘
```

## 🔧 Technical Implementation

### Backend API Endpoints

#### 1. Export Flashcards

```typescript
GET /api/admin/chapters/:chapterId/flashcards/export

Query Parameters:
- format: 'csv' | 'xlsx' | 'json' (default: 'csv')
- includeMetadata: boolean (default: false)

Response:
- Content-Type: text/csv or application/json
- Content-Disposition: attachment; filename="chapter-1-flashcards.csv"
- Body: CSV file content

Example Response (CSV):
question,answer
"What is gravity?","A force that attracts objects toward each other"
"Define photosynthesis","The process by which plants convert light energy into chemical energy"
```

#### 2. Import Flashcards (Preview)

```typescript
POST /api/admin/chapters/:chapterId/flashcards/import/preview

Request Body:
{
  file: File (multipart/form-data)
}

Response:
{
  totalRows: 15,
  validRows: 12,
  warnings: [
    {
      row: 2,
      type: 'duplicate',
      question: 'What is gravity?',
      message: 'Question already exists in this chapter'
    }
  ],
  errors: [
    {
      row: 3,
      type: 'missing_field',
      field: 'answer',
      message: 'Answer is required'
    }
  ],
  preview: [
    {
      row: 1,
      question: 'What is gravity?',
      answer: 'A force that attracts objects toward each other',
      status: 'valid'
    },
    // ... more rows
  ]
}
```

#### 3. Import Flashcards (Execute)

```typescript
POST /api/admin/chapters/:chapterId/flashcards/import

Request Body:
{
  file: File (multipart/form-data),
  options: {
    skipDuplicates: boolean,
    skipErrors: boolean,
    replaceDuplicates: boolean
  }
}

Response:
{
  success: true,
  imported: 12,
  skipped: 3,
  errors: [],
  flashcards: [
    {
      id: 1,
      question: 'What is gravity?',
      answer: 'A force that attracts...',
      chapter_id: 5
    },
    // ... more flashcards
  ]
}
```

#### 4. Download CSV Template

```typescript
GET /api/admin/flashcards/template

Response:
- Content-Type: text/csv
- Content-Disposition: attachment; filename="flashcard-template.csv"
- Body:
question,answer
"Example question 1","Example answer 1"
"Example question 2","Example answer 2"
```

### Backend Service Implementation

#### FlashcardsService

```typescript
// apps/backend/src/modules/flashcards/flashcards.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flashcard } from './entities/flashcard.entity';
import * as Papa from 'papaparse';

@Injectable()
export class FlashcardsService {
  constructor(
    @InjectRepository(Flashcard)
    private flashcardRepository: Repository<Flashcard>,
  ) {}

  /**
   * Export flashcards to CSV
   */
  async exportToCSV(chapterId: number): Promise<string> {
    const flashcards = await this.flashcardRepository.find({
      where: { chapter_id: chapterId },
      order: { created_at: 'ASC' },
    });

    const csvData = flashcards.map((fc) => ({
      question: fc.question,
      answer: fc.answer,
    }));

    return Papa.unparse(csvData, {
      quotes: true,
      header: true,
    });
  }

  /**
   * Preview CSV import
   */
  async previewImport(chapterId: number, file: Express.Multer.File) {
    const csvContent = file.buffer.toString('utf-8');

    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    const validRows = [];
    const warnings = [];
    const errors = [];

    // Get existing questions for duplicate check
    const existingFlashcards = await this.flashcardRepository.find({
      where: { chapter_id: chapterId },
      select: ['question'],
    });
    const existingQuestions = new Set(existingFlashcards.map((fc) => fc.question.toLowerCase().trim()));

    parseResult.data.forEach((row: any, index: number) => {
      const rowNumber = index + 2; // +2 because index starts at 0 and row 1 is header

      // Validation
      if (!row.question || !row.answer) {
        errors.push({
          row: rowNumber,
          type: 'missing_field',
          field: !row.question ? 'question' : 'answer',
          message: `${!row.question ? 'Question' : 'Answer'} is required`,
        });
        return;
      }

      if (row.question.length > 500) {
        errors.push({
          row: rowNumber,
          type: 'length_exceeded',
          field: 'question',
          message: 'Question exceeds 500 characters',
        });
        return;
      }

      if (row.answer.length > 1000) {
        errors.push({
          row: rowNumber,
          type: 'length_exceeded',
          field: 'answer',
          message: 'Answer exceeds 1000 characters',
        });
        return;
      }

      // Check for duplicates
      if (existingQuestions.has(row.question.toLowerCase().trim())) {
        warnings.push({
          row: rowNumber,
          type: 'duplicate',
          question: row.question,
          message: 'Question already exists in this chapter',
        });
      }

      validRows.push({
        row: rowNumber,
        question: row.question.trim(),
        answer: row.answer.trim(),
        status: 'valid',
      });
    });

    return {
      totalRows: parseResult.data.length,
      validRows: validRows.length,
      warnings,
      errors,
      preview: validRows.slice(0, 10), // Show first 10 for preview
    };
  }

  /**
   * Import flashcards from CSV
   */
  async importFromCSV(
    chapterId: number,
    file: Express.Multer.File,
    options: {
      skipDuplicates?: boolean;
      skipErrors?: boolean;
      replaceDuplicates?: boolean;
    } = {},
  ) {
    const csvContent = file.buffer.toString('utf-8');

    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    const flashcardsToCreate = [];
    const skipped = [];

    // Get existing questions
    const existingFlashcards = await this.flashcardRepository.find({
      where: { chapter_id: chapterId },
    });
    const existingQuestionsMap = new Map(existingFlashcards.map((fc) => [fc.question.toLowerCase().trim(), fc]));

    for (const row of parseResult.data) {
      // Skip invalid rows
      if (!row.question || !row.answer) {
        if (options.skipErrors) {
          skipped.push({ reason: 'missing_field', row });
          continue;
        }
      }

      const questionKey = row.question.toLowerCase().trim();

      // Handle duplicates
      if (existingQuestionsMap.has(questionKey)) {
        if (options.skipDuplicates) {
          skipped.push({ reason: 'duplicate', row });
          continue;
        } else if (options.replaceDuplicates) {
          // Update existing flashcard
          const existing = existingQuestionsMap.get(questionKey);
          existing.answer = row.answer.trim();
          await this.flashcardRepository.save(existing);
          continue;
        }
      }

      flashcardsToCreate.push({
        chapter_id: chapterId,
        question: row.question.trim(),
        answer: row.answer.trim(),
      });
    }

    const createdFlashcards = await this.flashcardRepository.save(flashcardsToCreate);

    return {
      success: true,
      imported: createdFlashcards.length,
      skipped: skipped.length,
      errors: [],
      flashcards: createdFlashcards,
    };
  }

  /**
   * Generate CSV template
   */
  generateTemplate(): string {
    const template = [
      {
        question: 'What is the capital of France?',
        answer: 'Paris',
      },
      {
        question: 'What is 2 + 2?',
        answer: '4',
      },
      {
        question: 'Who wrote Romeo and Juliet?',
        answer: 'William Shakespeare',
      },
    ];

    return Papa.unparse(template, {
      quotes: true,
      header: true,
    });
  }
}
```

### Frontend Implementation (React Admin)

#### ChapterShow Component

```typescript
// apps/admin/src/resources/chapters/ChapterShow.tsx

import React, { useState } from 'react';
import {
  Show,
  SimpleShowLayout,
  TextField,
  ReferenceField,
  ReferenceManyField,
  Datagrid,
  TopToolbar,
  Button,
  useNotify,
  useRefresh,
  useRecordContext,
} from 'react-admin';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import { ImportFlashcardsDialog } from './ImportFlashcardsDialog';

const ChapterShowActions = () => {
  const record = useRecordContext();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const notify = useNotify();

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/admin/chapters/${record.id}/flashcards/export`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chapter-${record.id}-flashcards.csv`;
      a.click();

      notify('Flashcards exported successfully', { type: 'success' });
    } catch (error) {
      notify('Error exporting flashcards', { type: 'error' });
    }
  };

  return (
    <TopToolbar>
      <Button
        label="Import Flashcards"
        onClick={() => setImportDialogOpen(true)}
        startIcon={<UploadIcon />}
      />
      <Button
        label="Export Flashcards"
        onClick={handleExport}
        startIcon={<DownloadIcon />}
      />
      <ImportFlashcardsDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        chapterId={record?.id}
      />
    </TopToolbar>
  );
};

export const ChapterShow = () => (
  <Show actions={<ChapterShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="title" />
      <ReferenceField source="book_id" reference="books">
        <TextField source="title" />
      </ReferenceField>

      <ReferenceManyField
        label="Flashcards"
        reference="flashcards"
        target="chapter_id"
      >
        <Datagrid>
          <TextField source="question" />
          <TextField source="answer" />
        </Datagrid>
      </ReferenceManyField>
    </SimpleShowLayout>
  </Show>
);
```

#### Import Dialog Component

```typescript
// apps/admin/src/resources/chapters/ImportFlashcardsDialog.tsx

import React, { useState } from 'react';
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
} from '@mui/material';
import { useNotify, useRefresh } from 'react-admin';

interface ImportFlashcardsDialogProps {
  open: boolean;
  onClose: () => void;
  chapterId: number;
}

export const ImportFlashcardsDialog: React.FC<ImportFlashcardsDialogProps> = ({
  open,
  onClose,
  chapterId,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [skipErrors, setSkipErrors] = useState(true);
  const notify = useNotify();
  const refresh = useRefresh();

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
      const response = await fetch(
        `/api/admin/chapters/${chapterId}/flashcards/import/preview`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        }
      );

      const data = await response.json();
      setPreview(data);
      setActiveStep(1);
    } catch (error) {
      notify('Error previewing file', { type: 'error' });
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify({ skipDuplicates, skipErrors }));

    try {
      const response = await fetch(
        `/api/admin/chapters/${chapterId}/flashcards/import`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        }
      );

      const data = await response.json();
      notify(`Successfully imported ${data.imported} flashcards`, {
        type: 'success',
      });
      refresh();
      onClose();
    } catch (error) {
      notify('Error importing flashcards', { type: 'error' });
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
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && (
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ marginBottom: 16 }}
            />
            <Alert severity="info" sx={{ mt: 2 }}>
              CSV Format: Two columns (question, answer), UTF-8 encoding
            </Alert>
          </div>
        )}

        {activeStep === 1 && preview && (
          <div>
            <Alert severity="success" sx={{ mb: 2 }}>
              Valid: {preview.validRows} flashcards
            </Alert>
            {preview.warnings.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Warnings: {preview.warnings.length}
              </Alert>
            )}
            {preview.errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Errors: {preview.errors.length}
              </Alert>
            )}

            <List>
              {preview.preview.map((row: any) => (
                <ListItem key={row.row}>
                  <ListItemText
                    primary={row.question}
                    secondary={row.answer}
                  />
                </ListItem>
              ))}
            </List>

            <FormControlLabel
              control={
                <Checkbox
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                />
              }
              label="Skip duplicate questions"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={skipErrors}
                  onChange={(e) => setSkipErrors(e.target.checked)}
                />
              }
              label="Skip rows with errors"
            />
          </div>
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
          <Button
            onClick={handleImport}
            disabled={importing}
            variant="contained"
          >
            Import {preview?.validRows} Cards
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
```

## 📦 Dependencies

### Backend

```json
{
  "papaparse": "^5.4.1",
  "@types/papaparse": "^5.3.7",
  "multer": "^1.4.5-lts.1",
  "@types/multer": "^1.4.7"
}
```

### Frontend

```json
{
  "@mui/material": "^5.14.0",
  "@mui/icons-material": "^5.14.0"
}
```

## ⚠️ Error Handling

### Common Errors

| Error Code            | Message                                       | Resolution                    |
| --------------------- | --------------------------------------------- | ----------------------------- |
| `INVALID_FILE_FORMAT` | File must be CSV format                       | Upload a .csv file            |
| `MISSING_COLUMNS`     | CSV must have 'question' and 'answer' columns | Check CSV headers             |
| `EMPTY_FILE`          | CSV file is empty                             | Add flashcards to CSV         |
| `FILE_TOO_LARGE`      | File size exceeds 5MB                         | Split into smaller files      |
| `INVALID_ENCODING`    | File must be UTF-8 encoded                    | Re-save as UTF-8              |
| `DUPLICATE_QUESTIONS` | Some questions already exist                  | Choose skip or replace option |

## 🔒 Security Considerations

1. **File Validation**:
   - Check file extension (.csv only)
   - Validate MIME type (text/csv)
   - Limit file size (max 5MB)
   - Scan for malicious content

2. **Input Sanitization**:
   - Escape HTML in questions/answers
   - Validate length limits
   - Remove dangerous characters

3. **Authentication**:
   - Require admin/staff role
   - Validate JWT token
   - Check chapter ownership

4. **Rate Limiting**:
   - Limit imports to 10 per hour per user
   - Prevent abuse

## ⌨️ Testing

### Test Cases

1. **Valid Import**:
   - ✅ Import CSV with 10 valid flashcards
   - ✅ Verify all flashcards created in database
   - ✅ Check correct chapter_id assignment

2. **Duplicate Handling**:
   - ✅ Import CSV with duplicate questions
   - ✅ Verify skip duplicates option works
   - ✅ Verify replace duplicates option works

3. **Error Handling**:
   - ✅ Import CSV with missing fields
   - ✅ Import CSV with invalid encoding
   - ✅ Import empty CSV file
   - ✅ Import file that's too large

4. **Export**:
   - ✅ Export flashcards to CSV
   - ✅ Verify CSV format is correct
   - ✅ Verify special characters are escaped

5. **Edge Cases**:
   - ✅ Import CSV with multiline answers
   - ✅ Import CSV with special characters (quotes, commas)
   - ✅ Import CSV with Unicode characters
   - ✅ Import very long questions/answers

## 📝 Future Enhancements

1. **Excel Support**: Import/export .xlsx files
2. **JSON Support**: Import/export JSON format
3. **Bulk Edit**: Edit multiple flashcards in CSV and re-import
4. **Validation Rules**: Custom validation rules per chapter
5. **Auto-Translation**: Translate flashcards to multiple languages
6. **Image Support**: Include images in flashcards via URLs
7. **Tags**: Add tags column for categorization
8. **Difficulty**: Add difficulty level column
9. **Scheduling**: Schedule imports for later
10. **History**: Track import history and rollback

## 🚀 Deployment Checklist

- [ ] Install papaparse dependency
- [ ] Configure multer for file uploads
- [ ] Add API endpoints to admin controller
- [ ] Implement service methods
- [ ] Create React Admin components
- [ ] Add file upload validation
- [ ] Test with sample CSV files
- [ ] Update API documentation
- [ ] Add user guide to admin dashboard
- [ ] Monitor import performance

---

**Status**: ✅ Design Complete
**Next Steps**: Implementation
**Estimated Time**: 2-3 days
