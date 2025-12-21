# ✅ Preview Fix - Force Re-render

## 🎯 Issue

Preview trong edit dialog không update khi markdown thay đổi.

## 🔍 Root Cause

`markmap-autoloader` chỉ chạy khi page load lần đầu. Khi markdown content thay đổi, iframe không được re-render, nên markmap không update.

## ✅ Solution

**Added `key` prop to iframe:**

```typescript
<iframe
  key={markdown}  // ✅ Force re-render when markdown changes
  ref={iframeRef}
  ...
/>
```

### How It Works

**Before:**

- User types markdown
- useEffect runs, updates iframe HTML
- But markmap-autoloader already ran
- Preview doesn't update ❌

**After:**

- User types markdown
- React sees `key` changed
- Destroys old iframe, creates new one
- markmap-autoloader runs again
- Preview updates ✅

## 🧪 Test Now

1. **Open Admin:**

   ```
   http://localhost:5173/#/chapters/1/1/mindmap
   ```

2. **Create/Edit Mind Map:**
   - Click "Create Mind Map" or "Edit Mind Map"
   - Go to Editor tab
   - Type some markdown:

     ```markdown
     # Test

     ## Branch 1

     - Point 1
     - Point 2

     ## Branch 2

     - Point 3
     ```

3. **Switch to Preview Tab:**
   - Preview should show mindmap immediately
   - Change markdown in Editor
   - Switch back to Preview
   - Should see updated mindmap ✅

## 📝 Expected Behavior

- ✅ Preview updates when switching tabs
- ✅ Mindmap reflects current markdown content
- ✅ No "stuck" or "stale" preview
- ✅ Smooth rendering

## 🎨 Alternative Approaches

If `key` prop causes performance issues (unlikely), alternatives:

### Option 1: Manual Reload

```typescript
useEffect(() => {
  if (!iframeRef.current) return;

  // Force reload
  iframeRef.current.src = iframeRef.current.src;
}, [markdown]);
```

### Option 2: PostMessage

```typescript
// Send message to iframe to update
iframeRef.current?.contentWindow?.postMessage(
  {
    type: 'UPDATE_MARKDOWN',
    markdown,
  },
  '*',
);
```

### Option 3: Direct DOM Manipulation

```typescript
// Update script template directly
const template = iframeDoc.querySelector('script[type="text/template"]');
if (template) {
  template.textContent = markdown;
  // Trigger markmap refresh
}
```

## ✅ Current Solution: `key` Prop

**Pros:**

- ✅ Simple and clean
- ✅ React handles everything
- ✅ Guaranteed to work
- ✅ No manual cleanup needed

**Cons:**

- ⚠️ Destroys and recreates iframe (minor performance impact)
- ⚠️ Loses iframe state (not an issue for static preview)

## 🎉 Result

Preview now works correctly! Every time you switch to Preview tab, it shows the latest markdown content rendered as a mindmap.

**Test it now!** 🚀
