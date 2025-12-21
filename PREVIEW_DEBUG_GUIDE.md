# 🔧 Preview Not Working - Debug Steps

## 📋 Current Status

Preview trong edit dialog **đã được setup đúng**:

- ✅ Component `MarkmapPreview` đã được import
- ✅ Component được sử dụng trong Preview tab (line 365)
- ✅ File `MindMapPreview.tsx` đã tồn tại với markmap-autoloader

## 🧪 Test Steps

### 1. **Test Markmap Autoloader**

Mở file test trong browser:

```
file:///d:/code/2025/quiz_game/quiz_game/test-markmap-autoloader.html
```

**Expected:**

- ✅ Status shows "Markmap loaded successfully!"
- ✅ Mindmap hiển thị với các nodes
- ✅ Có thể click để expand/collapse

**If fails:**

- ❌ Check browser console (F12) for errors
- ❌ Check Network tab for CDN loading issues
- ❌ Try different browser

### 2. **Test in Admin**

```
http://localhost:5173/#/chapters/1/1/mindmap
```

**Steps:**

1. Click "Edit Mind Map" hoặc "Create Mind Map"
2. Switch to "Preview" tab
3. Check if mindmap renders

**Expected:**

- ✅ Preview tab shows mindmap
- ✅ Markmap renders from markdown

**If fails:**

- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed requests

### 3. **Common Issues**

#### Issue 1: CDN Blocked

**Symptom:** Network tab shows failed request to `cdn.jsdelivr.net`

**Fix:** Use alternative CDN in `MindMapPreview.tsx`:

```typescript
// Change line 40 from:
<script src="https://cdn.jsdelivr.net/npm/markmap-autoloader"></script>

// To:
<script src="https://unpkg.com/markmap-autoloader"></script>
```

#### Issue 2: Iframe Not Loading

**Symptom:** Preview tab is blank

**Debug:**

```typescript
// Add console.log in MindMapPreview.tsx after line 10:
console.log('Iframe doc:', iframeDoc);
console.log('Markdown:', markdown);
```

#### Issue 3: Markdown Empty

**Symptom:** Preview shows but no mindmap

**Check:**

- Is `markdownContent` state populated?
- Add console.log in MindMapTab.tsx:

```typescript
console.log('Markdown content:', markdownContent);
```

## 🔍 Debug Checklist

- [ ] Test HTML file loads markmap correctly
- [ ] Browser console shows no errors
- [ ] Network tab shows CDN loaded (status 200)
- [ ] Iframe is created in DOM
- [ ] Markdown content is not empty
- [ ] Preview tab is selected (activeTab === 1)

## 📝 Quick Fixes

### Fix 1: Force Reload

```bash
# Hard refresh browser
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

### Fix 2: Clear Cache

```
Browser → Settings → Clear browsing data → Cached images and files
```

### Fix 3: Check Markdown Content

In edit dialog, make sure markdown editor has content:

```markdown
# Test

## Branch 1

- Point 1

## Branch 2

- Point 2
```

## 🎯 Expected Behavior

**When working correctly:**

1. Open edit dialog
2. Type markdown in Editor tab
3. Switch to Preview tab
4. See mindmap render immediately
5. Changes in Editor reflect in Preview

## 📞 If Still Not Working

**Provide these details:**

1. Browser console errors (screenshot)
2. Network tab (screenshot showing CDN requests)
3. Does test HTML file work?
4. What happens when you switch to Preview tab?

## ✅ Next Steps

1. **Test the HTML file first** - This confirms markmap-autoloader works
2. **If HTML works** - Problem is in React component
3. **If HTML fails** - CDN or network issue

**Test now:**

```
Open: file:///d:/code/2025/quiz_game/quiz_game/test-markmap-autoloader.html
```
