# Troubleshooting: react-native-pdf Error

## Error: `this.lastRNBFTask.cancel is not a function`

### Quick Fix (Applied)

Added `key={fileUrl}` prop to force component re-mount when source changes.

### If Error Persists

Downgrade `react-native-pdf` to a more stable version:

```bash
cd apps/mobile
npm install react-native-pdf@6.7.3
npx expo run:android
```

### Alternative: Use react-native-blob-util patch

If downgrade doesn't work, apply this patch to `node_modules/react-native-pdf/index.js`:

Find the line:

```javascript
this.lastRNBFTask = ReactNativeBlobUtil.config(options).fetch('GET', source.uri, headers);
```

Replace with:

```javascript
const task = ReactNativeBlobUtil.config(options).fetch('GET', source.uri, headers);
this.lastRNBFTask = task;
return task.then(...);
```

### Root Cause

The error occurs because `this.lastRNBFTask` is assigned a Promise instead of the actual fetch task object, which doesn't have a `cancel()` method.

### References

- https://github.com/wonday/react-native-pdf/issues/932
- https://github.com/wonday/react-native-pdf/issues/876
