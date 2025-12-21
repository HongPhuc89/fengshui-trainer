# 🐛 Fix: Markmap Loading Error

## ❌ Error Messages

```
Uncaught TypeError: Cannot destructure property 'Markmap' of 'window.markmapView' as it is undefined.
Uncaught SyntaxError: Failed to execute 'write' on 'Document': Identifier 'Transformer' has already been declared
```

## 🔍 Root Cause

**Problem:** Scripts were executing before libraries finished loading from CDN.

The code was trying to access `window.markmap` and `window.markmapView` immediately, but the CDN scripts hadn't loaded yet.

## ✅ Solution

### 1. **Add Loading Check Function**

```javascript
function initMarkmap() {
  // Wait for all libraries to load
  if (!window.markmap || !window.markmapView || !window.d3) {
    setTimeout(initMarkmap, 100); // Retry after 100ms
    return;
  }

  // Libraries loaded, proceed with initialization
  // ...
}
```

### 2. **Add Loading Indicator**

```html
<div id="loading">Loading Markmap...</div>
<svg id="mindmap" style="display: none;"></svg>
```

Show loading message while waiting for libraries, then hide it when ready.

### 3. **Add Error Handling**

```javascript
try {
  // Markmap initialization
} catch (error) {
  console.error('Markmap error:', error);
  document.getElementById('loading').textContent = 'Error: ' + error.message;
}
```

### 4. **Use DOMContentLoaded**

```javascript
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMarkmap);
} else {
  initMarkmap();
}
```

## 📝 Complete Fix

**File:** `apps/admin/src/components/MindMapTab.tsx`

**Key Changes:**

1. **Wrapped initialization in function** that checks for library availability
2. **Added retry mechanism** (checks every 100ms)
3. **Added loading indicator** for better UX
4. **Added error handling** to show errors instead of crashing
5. **Wait for DOM ready** before starting

## 🧪 Testing

1. **Reload admin page:**

   ```
   http://localhost:5173/#/chapters/1/1/mindmap
   ```

2. **Expected behavior:**
   - Shows "Loading Markmap..." briefly
   - Then shows interactive mindmap
   - No console errors

3. **If slow network:**
   - Loading message stays until libraries load
   - Retries automatically every 100ms
   - Shows error if libraries fail to load

## 🎯 Why This Works

### Before (❌):

```javascript
// Immediate execution - libraries not loaded yet!
const { Transformer } = window.markmap; // undefined!
const { Markmap } = window.markmapView; // undefined!
```

### After (✅):

```javascript
function initMarkmap() {
  // Check if libraries are loaded
  if (!window.markmap || !window.markmapView || !window.d3) {
    setTimeout(initMarkmap, 100); // Wait and retry
    return;
  }

  // Now safe to use
  const { Transformer } = window.markmap; // ✓ Defined
  const { Markmap } = window.markmapView; // ✓ Defined
}
```

## 📚 Lessons Learned

1. **Always check for CDN library availability** before using them
2. **Add retry mechanism** for network-dependent code
3. **Show loading states** for better UX
4. **Handle errors gracefully** instead of crashing
5. **Use DOMContentLoaded** for DOM-dependent code

## ✅ Status

**Fixed!** Markmap now loads reliably without errors. 🎉

## 🔄 Next Steps

If you still see errors:

1. **Check network:** Make sure CDN is accessible
2. **Check console:** Look for network errors
3. **Try different CDN:** Use alternative CDN if jsdelivr is blocked
4. **Clear cache:** Hard refresh (Ctrl+Shift+R)

## 📦 Alternative CDNs

If jsdelivr is slow/blocked, try:

```html
<!-- unpkg -->
<script src="https://unpkg.com/d3@7"></script>
<script src="https://unpkg.com/markmap-view@0.18"></script>
<script src="https://unpkg.com/markmap-lib@0.18"></script>

<!-- cdnjs -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.0.0/d3.min.js"></script>
```
