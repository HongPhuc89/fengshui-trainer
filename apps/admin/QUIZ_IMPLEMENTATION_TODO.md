# Quiz Questions Tab - Remaining Implementation Tasks

## ✅ Completed:

1. Created sub-components in `quiz-forms/`:
   - TrueFalseForm
   - MultipleChoiceForm
   - MultipleAnswerForm
   - MatchingForm
   - OrderingForm

2. Added MATCHING and ORDERING to dropdown options
3. Added state fields for matching pairs and ordering items
4. Updated buildOptionsJson() to handle MATCHING and ORDERING
5. Updated resetForm() to include new fields

## 🔄 TODO (Next Steps):

### 1. Add Helper Functions for MATCHING (add after line 268):

```typescript
// Matching helpers
const updateMatchingPair = (index: number, field: 'left' | 'right', value: string) => {
  const newPairs = [...formData.matchingPairs];
  newPairs[index][field] = value;
  setFormData({ ...formData, matchingPairs: newPairs });
};

const addMatchingPair = () => {
  const newId = Math.max(...formData.matchingPairs.map((p) => p.id), 0) + 1;
  setFormData({
    ...formData,
    matchingPairs: [...formData.matchingPairs, { id: newId, left: '', right: '' }],
  });
};

const removeMatchingPair = (index: number) => {
  setFormData({
    ...formData,
    matchingPairs: formData.matchingPairs.filter((_, i) => i !== index),
  });
};
```

### 2. Add Helper Functions for ORDERING (add after matching helpers):

```typescript
// Ordering helpers
const updateOrderingItem = (index: number, text: string) => {
  const newItems = [...formData.orderingItems];
  newItems[index].text = text;
  setFormData({ ...formData, orderingItems: newItems });
};

const addOrderingItem = () => {
  const newId = String.fromCharCode(97 + formData.orderingItems.length); // a, b, c...
  setFormData({
    ...formData,
    orderingItems: [
      ...formData.orderingItems,
      { id: newId, text: '', correct_order: formData.orderingItems.length + 1 },
    ],
  });
};

const removeOrderingItem = (index: number) => {
  const filtered = formData.orderingItems.filter((_, i) => i !== index);
  // Reorder
  const reordered = filtered.map((item, idx) => ({ ...item, correct_order: idx + 1 }));
  setFormData({ ...formData, orderingItems: reordered });
};

const moveOrderingItemUp = (index: number) => {
  if (index === 0) return;
  const newItems = [...formData.orderingItems];
  [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
  const reordered = newItems.map((item, idx) => ({ ...item, correct_order: idx + 1 }));
  setFormData({ ...formData, orderingItems: reordered });
};

const moveOrderingItemDown = (index: number) => {
  if (index === formData.orderingItems.length - 1) return;
  const newItems = [...formData.orderingItems];
  [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
  const reordered = newItems.map((item, idx) => ({ ...item, correct_order: idx + 1 }));
  setFormData({ ...formData, orderingItems: reordered });
};
```

### 3. Add Form UI Sections (add after MULTIPLE_ANSWER section, around line 400+):

```typescript
{/* MATCHING Options */}
{formData.question_type === 'MATCHING' && (
  <MatchingForm
    pairs={formData.matchingPairs}
    onUpdatePair={updateMatchingPair}
    onAddPair={addMatchingPair}
    onRemovePair={removeMatchingPair}
  />
)}

{/* ORDERING Options */}
{formData.question_type === 'ORDERING' && (
  <OrderingForm
    items={formData.orderingItems}
    onUpdateItem={updateOrderingItem}
    onAddItem={addOrderingItem}
    onRemoveItem={removeOrderingItem}
    onMoveUp={moveOrderingItemUp}
    onMoveDown={moveOrderingItemDown}
  />
)}
```

### 4. Add Imports at Top:

```typescript
import { MatchingForm } from './quiz-forms/MatchingForm';
import { OrderingForm } from './quiz-forms/OrderingForm';
```

## File Location:

`apps/admin/src/components/QuizQuestionsTab.tsx`
