# Performance Optimizations & Animations

This document describes all the performance optimizations and animations implemented in the Home Screen components.

## 🚀 Performance Optimizations

### 1. **React.memo** - Preventing Unnecessary Re-renders

All components are wrapped with `React.memo` to prevent re-rendering when props haven't changed.

#### Components Memoized:

- ✅ `AppHeader` - Simple memo
- ✅ `SectionHeader` - Simple memo
- ✅ `BookIcon` - Simple memo
- ✅ `BookInfo` - Simple memo
- ✅ `BookCard` - Custom comparison function
- ✅ `BooksList` - Simple memo

#### Example: BookCard with Custom Comparison

```tsx
export const BookCard = React.memo(BookCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.category === nextProps.category &&
    prevProps.description === nextProps.description &&
    prevProps.chapterCount === nextProps.chapterCount &&
    prevProps.initial === nextProps.initial &&
    prevProps.gradientColors[0] === nextProps.gradientColors[0] &&
    prevProps.gradientColors[1] === nextProps.gradientColors[1] &&
    prevProps.index === nextProps.index
  );
});
```

**Why custom comparison?**

- Array props (`gradientColors`) need deep comparison
- Default shallow comparison would fail for arrays
- Custom function checks each array element individually

---

### 2. **useMemo** - Caching Expensive Computations

Used in `BooksList` to cache processed book data.

```tsx
const processedBooks = useMemo(() => {
  return books.map((book, index) => ({
    ...book,
    initial: getBookInitial(book.title),
    category: getCategoryLabel(index),
    gradientColors: getIconGradient(index),
    chapterCount: Math.floor(Math.random() * 8) + 3,
    description: book.description || 'Default description...',
  }));
}, [books]);
```

**Benefits:**

- ✅ Calculations only run when `books` array changes
- ✅ Prevents recalculating initials, categories, gradients on every render
- ✅ Significant performance gain with large book lists

---

### 3. **useCallback** - Memoizing Event Handlers

Used to prevent creating new function instances on every render.

#### In HomeScreen:

```tsx
const handleBookPress = useCallback(
  (bookId: number) => {
    router.push(`/books/${bookId}`);
  },
  [router],
);
```

#### In BooksList:

```tsx
const handleBookPress = useCallback(
  (bookId: number) => {
    onBookPress(bookId);
  },
  [onBookPress],
);
```

**Benefits:**

- ✅ Same function reference across renders
- ✅ Prevents child components from re-rendering
- ✅ Works perfectly with `React.memo`

---

## 🎨 Animations

### 1. **Entrance Animations** (BookCard)

Each book card animates in with three simultaneous effects:

#### Fade In

```tsx
const fadeAnim = useRef(new Animated.Value(0)).current;

Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 600,
  delay: index * 100, // Staggered
  useNativeDriver: true,
}).start();
```

#### Slide Up

```tsx
const slideAnim = useRef(new Animated.Value(50)).current;

Animated.timing(slideAnim, {
  toValue: 0,
  duration: 600,
  delay: index * 100,
  useNativeDriver: true,
}).start();
```

#### Scale Up

```tsx
const scaleAnim = useRef(new Animated.Value(0.95)).current;

Animated.timing(scaleAnim, {
  toValue: 1,
  duration: 600,
  delay: index * 100,
  useNativeDriver: true,
}).start();
```

**Staggered Effect:**

- Each card delays by `index * 100ms`
- Creates a cascading entrance effect
- First card: 0ms delay
- Second card: 100ms delay
- Third card: 200ms delay
- And so on...

---

### 2. **Press Animations** (BookCard)

Interactive feedback when user presses a card.

#### Press In (Scale Down)

```tsx
const handlePressIn = () => {
  Animated.spring(scaleAnim, {
    toValue: 0.97,
    useNativeDriver: true,
  }).start();
};
```

#### Press Out (Scale Back)

```tsx
const handlePressOut = () => {
  Animated.spring(scaleAnim, {
    toValue: 1,
    friction: 3,
    useNativeDriver: true,
  }).start();
};
```

**Spring Animation:**

- Natural, bouncy feel
- `friction: 3` for quick snap-back
- Better UX than linear timing

---

## 📊 Performance Metrics

### Before Optimization

```
Component Re-renders: High
Calculation Overhead: Every render
Animation Performance: N/A
Memory Usage: Higher (new functions each render)
```

### After Optimization

```
Component Re-renders: Minimal (only when props change)
Calculation Overhead: Only when data changes (useMemo)
Animation Performance: 60 FPS (native driver)
Memory Usage: Lower (memoized functions)
```

---

## 🎯 Animation Timeline

```
Card 1: [0ms]    ████████████████ (fade + slide + scale)
Card 2: [100ms]       ████████████████
Card 3: [200ms]            ████████████████
Card 4: [300ms]                 ████████████████
Card 5: [400ms]                      ████████████████
```

Total animation time: **600ms + (n-1) \* 100ms**

- For 5 cards: 600ms + 400ms = 1000ms total cascade

---

## 🔧 Configuration

### Adjusting Animation Speed

```tsx
// Faster animations (400ms)
duration: 400,

// Slower animations (800ms)
duration: 800,
```

### Adjusting Stagger Delay

```tsx
// Faster cascade (50ms between cards)
delay: index * 50,

// Slower cascade (150ms between cards)
delay: index * 150,
```

### Adjusting Press Scale

```tsx
// More dramatic press effect
toValue: 0.95,

// Subtle press effect
toValue: 0.98,
```

---

## 🎨 Animation Best Practices

### ✅ DO:

- Use `useNativeDriver: true` for better performance
- Use `Animated.parallel()` for simultaneous animations
- Use `useRef` for animation values (prevents re-creation)
- Use spring animations for natural feel
- Stagger entrance animations for visual appeal

### ❌ DON'T:

- Animate layout properties without native driver
- Create new Animated.Value on every render
- Use too many simultaneous animations (max 3-4)
- Make animations too slow (> 1000ms)
- Forget to cleanup animations on unmount

---

## 🧪 Testing Performance

### React DevTools Profiler

```bash
# Enable profiling
npm run start

# Open React DevTools
# Go to Profiler tab
# Record interaction
# Check render times
```

### Expected Results:

- **Initial render:** ~100-200ms
- **Scroll:** ~16ms per frame (60 FPS)
- **Press interaction:** ~16ms per frame
- **Re-render (same props):** 0ms (memoized)

---

## 🚀 Future Enhancements

### Potential Additions:

1. **Scroll-based animations**
   - Parallax effects
   - Fade in/out based on scroll position
   - Scale based on distance from center

2. **Skeleton loading**
   - Animated placeholders while loading
   - Shimmer effect

3. **Pull-to-refresh animation**
   - Custom refresh indicator
   - Bounce effect

4. **Shared element transitions**
   - Animate from card to detail screen
   - Hero image animation

5. **Micro-interactions**
   - Haptic feedback on press
   - Sound effects (optional)
   - Particle effects on special actions

---

## 📚 References

- [React.memo Documentation](https://react.dev/reference/react/memo)
- [useMemo Hook](https://react.dev/reference/react/useMemo)
- [useCallback Hook](https://react.dev/reference/react/useCallback)
- [React Native Animated API](https://reactnative.dev/docs/animated)
- [Performance Optimization](https://reactnative.dev/docs/performance)
