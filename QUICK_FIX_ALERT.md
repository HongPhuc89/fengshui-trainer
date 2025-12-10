## Quick Fix: Replace Alert.alert with confirm

Vấn đề: Alert.alert trên web không trigger callbacks.

### Giải pháp tạm thời:

Thay thế đoạn code từ dòng 114-160 trong file `apps/mobile/app/quiz/[chapterId].tsx`:

**TỪ:**

```typescript
console.log('⚠️ Showing confirmation alert...');
Alert.alert('Nộp bài', 'Bạn có chắc muốn nộp bài? Bạn không thể thay đổi câu trả lời sau khi nộp.', [
  {
    text: 'Hủy',
    style: 'cancel',
    onPress: () => console.log('❌ User cancelled submit'),
  },
  {
    text: 'Nộp bài',
    onPress: async () => {
      // ... code submission ...
    },
  },
]);
```

**THÀNH:**

```typescript
// Use confirm for web compatibility (Alert.alert doesn't work on web)
const confirmed = confirm('Bạn có chắc muốn nộp bài?\n\nBạn không thể thay đổi câu trả lời sau khi nộp.');
if (!confirmed) {
  console.log('❌ User cancelled submit');
  return;
}

console.log('🚀 User confirmed - starting submission');
try {
  console.log('📝 Setting submitting to true');
  setSubmitting(true);

  console.log('📤 Calling completeQuiz...');
  const result = await quizService.completeQuiz(session.id);
  console.log('✅ Quiz completed!');
  console.log('📊 Result:', result);

  // Show modal
  console.log('🎭 Showing modal...');
  setQuizResult(result);
  setShowResultModal(true);
  console.log('🎭 Modal state set');
} catch (error: any) {
  console.error('❌ Error:', error);
  alert('Error: ' + (error.response?.data?.message || 'Failed to submit'));
} finally {
  setSubmitting(false);
}
```

### Cách thay thế nhanh:

1. Mở file `apps/mobile/app/quiz/[chapterId].tsx`
2. Tìm dòng 114: `console.log('⚠️ Showing confirmation alert...');`
3. Xóa từ dòng 114 đến dòng 160 (bao gồm `]);`)
4. Paste code mới ở trên vào

Sau đó test lại!
