# Example Components

This directory contains complete example components demonstrating how to use the API services and hooks in real React Native screens.

## Available Examples

### 1. BooksListScreen.example.tsx

A complete books list screen showing:

- ✅ Fetching data with `useBooks()` hook
- ✅ Loading states with ActivityIndicator
- ✅ Error handling with retry functionality
- ✅ Empty state handling
- ✅ Pull-to-refresh functionality
- ✅ FlatList with proper item rendering
- ✅ Navigation to detail screen
- ✅ Styled components with StyleSheet

**Key Features:**

- Automatic data fetching on mount
- Refresh control for manual refresh
- Error boundary with retry button
- Responsive card design
- Image placeholder handling

### 2. QuizScreen.example.tsx

A comprehensive quiz screen demonstrating:

- ✅ Multi-step quiz workflow
- ✅ Quiz configuration display
- ✅ Starting a quiz attempt
- ✅ Answering different question types
- ✅ Submitting quiz answers
- ✅ Displaying results
- ✅ Retry functionality

**Key Features:**

- Three distinct states: Info → Quiz → Results
- Support for multiple question types:
  - Multiple choice
  - Multiple answer
  - True/False
- Progress tracking
- Answer validation
- Detailed results display
- Beautiful UI with conditional styling

## How to Use These Examples

### Option 1: Copy and Adapt

Copy the example file to your screens directory and modify as needed:

```bash
cp examples/BooksListScreen.example.tsx ../../../app/screens/BooksListScreen.tsx
```

### Option 2: Reference Implementation

Use these examples as a reference when building your own screens. They demonstrate best practices for:

1. **Hook Usage**

   ```typescript
   const { data, isLoading, error, refetch } = useHook();
   ```

2. **State Management**

   ```typescript
   const [localState, setLocalState] = useState();
   ```

3. **Error Handling**

   ```typescript
   if (error) {
     return <ErrorView onRetry={refetch} />;
   }
   ```

4. **Loading States**

   ```typescript
   if (isLoading && !data.length) {
     return <LoadingSpinner />;
   }
   ```

5. **Conditional Rendering**
   ```typescript
   {condition ? <ComponentA /> : <ComponentB />}
   ```

## Best Practices Demonstrated

### 1. Loading States

Always show loading indicators:

```typescript
if (isLoading && books.length === 0) {
  return <ActivityIndicator />;
}
```

### 2. Error Handling

Provide clear error messages and retry options:

```typescript
if (error) {
  return (
    <View>
      <Text>{error.message}</Text>
      <Button onPress={refetch}>Retry</Button>
    </View>
  );
}
```

### 3. Empty States

Handle empty data gracefully:

```typescript
if (books.length === 0) {
  return <EmptyState />;
}
```

### 4. Pull to Refresh

Implement refresh functionality:

```typescript
<FlatList
  refreshControl={
    <RefreshControl
      refreshing={isLoading}
      onRefresh={refetch}
    />
  }
/>
```

### 5. Type Safety

Use TypeScript types:

```typescript
import type { Book } from '../api';

const renderItem = ({ item }: { item: Book }) => {
  // item is fully typed
};
```

### 6. Separation of Concerns

Split complex components:

```typescript
// Main component
function QuizScreen() {
  return <QuestionCard question={q} />;
}

// Sub-component
function QuestionCard({ question }) {
  // Question-specific logic
}
```

## Common Patterns

### Pattern 1: List Screen

```typescript
function ListScreen() {
  const { data, isLoading, error, refetch } = useData();

  if (isLoading) return <Loading />;
  if (error) return <Error onRetry={refetch} />;
  if (!data.length) return <Empty />;

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      refreshControl={<RefreshControl onRefresh={refetch} />}
    />
  );
}
```

### Pattern 2: Detail Screen

```typescript
function DetailScreen({ route }) {
  const { id } = route.params;
  const { data, isLoading, error } = useDetail(id);

  if (isLoading) return <Loading />;
  if (error) return <Error />;

  return <DetailView data={data} />;
}
```

### Pattern 3: Form Screen

```typescript
function FormScreen() {
  const [formData, setFormData] = useState({});
  const { submit, isLoading } = useSubmit();

  const handleSubmit = async () => {
    try {
      await submit(formData);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <Form
      data={formData}
      onChange={setFormData}
      onSubmit={handleSubmit}
      loading={isLoading}
    />
  );
}
```

## Styling Guidelines

### 1. Use StyleSheet

Always use `StyleSheet.create()` for performance:

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### 2. Consistent Spacing

Use consistent spacing values:

```typescript
padding: 16,
margin: 16,
gap: 12,
```

### 3. Color Palette

Define colors consistently:

```typescript
const COLORS = {
  primary: '#007AFF',
  error: '#FF3B30',
  success: '#4CAF50',
  text: '#000000',
  textSecondary: '#666666',
  background: '#F5F5F5',
  card: '#FFFFFF',
};
```

### 4. Typography

Use consistent font sizes:

```typescript
const TYPOGRAPHY = {
  title: 24,
  heading: 18,
  body: 16,
  caption: 14,
  small: 12,
};
```

## Testing These Examples

### 1. Install Dependencies

Make sure you have all required dependencies:

```bash
npm install axios @react-native-async-storage/async-storage
```

### 2. Configure Environment

Set up your `.env` file:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### 3. Run the App

```bash
npm run dev
```

### 4. Navigate to Example Screen

Add navigation routes in your app:

```typescript
<Stack.Screen name="BooksList" component={BooksListScreen} />
<Stack.Screen name="Quiz" component={QuizScreen} />
```

## Customization Tips

### Modify Styles

Change colors, spacing, and typography to match your design:

```typescript
const styles = StyleSheet.create({
  container: {
    backgroundColor: YOUR_BACKGROUND_COLOR,
    padding: YOUR_SPACING,
  },
});
```

### Add Features

Extend examples with additional features:

- Search functionality
- Filtering
- Sorting
- Pagination
- Animations
- Gestures

### Integrate with Navigation

Use your navigation library (React Navigation, Expo Router, etc.):

```typescript
import { useNavigation } from '@react-navigation/native';

function MyScreen() {
  const navigation = useNavigation();
  // Use navigation
}
```

## Need Help?

- Check the [API Services README](../api/README.md)
- Check the [Hooks README](../hooks/README.md)
- Review the [API Integration Summary](../API_INTEGRATION_SUMMARY.md)
- Look at the inline comments in example files

## Contributing

Feel free to add more examples demonstrating:

- Flashcards screen
- Mind map viewer
- User profile screen
- Settings screen
- Authentication flow
- Offline support
