import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { useReadingProgress } from '../../hooks/useReadingProgress';
import { offlineCacheService } from '../../services/offline-cache/offline-cache.service';

interface ChapterFileViewerProps {
  chapterId: number;
  fileUrl: string;
  fileName: string;
  fileId?: number;
  fileUpdatedAt?: Date;
}

export function ChapterFileViewer({ chapterId, fileUrl, fileName, fileId, fileUpdatedAt }: ChapterFileViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cachedFilePath, setCachedFilePath] = useState<string | null>(null);
  const [caching, setCaching] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const { progress, saveProgress } = useReadingProgress(chapterId);

  // Load cached file or use URL
  useEffect(() => {
    loadFile();
  }, [fileUrl, fileId, fileUpdatedAt]);

  // Auto-scroll to last position when progress loads
  useEffect(() => {
    if (progress && progress.scrollPosition > 0 && webViewRef.current) {
      setTimeout(() => {
        const scrollScript = `
          window.scrollTo({
            top: document.documentElement.scrollHeight * ${progress.scrollPosition},
            behavior: 'smooth'
          });
          true;
        `;
        webViewRef.current?.injectJavaScript(scrollScript);
        console.log('[ChapterFileViewer] Auto-scrolled to:', Math.round(progress.scrollPosition * 100) + '%');
      }, 2000); // Wait longer for Google Docs Viewer to load
    }
  }, [progress, loading]);

  const loadFile = async () => {
    // If we have fileId and updatedAt, try to cache file in background
    if (fileId && fileUpdatedAt) {
      try {
        setCaching(true);
        const localPath = await offlineCacheService.getFile(fileUrl, fileId, fileName, fileUpdatedAt);

        if (localPath) {
          setCachedFilePath(localPath);
          console.log('[ChapterFileViewer] File cached for offline use');
        }
      } catch (error) {
        console.error('[ChapterFileViewer] Failed to cache file:', error);
      } finally {
        setCaching(false);
      }
    }
  };

  const handleOpenExternal = () => {
    Linking.openURL(fileUrl);
  };

  // Inject JavaScript to track scroll position
  const injectedJavaScript = `
    (function() {
      let lastScrollPosition = 0;
      let scrollTimeout;

      console.log('[WebView] Scroll tracking initialized');

      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        
        scrollTimeout = setTimeout(() => {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const scrollHeight = document.documentElement.scrollHeight;
          const clientHeight = document.documentElement.clientHeight;
          const scrollPercent = scrollTop / (scrollHeight - clientHeight);
          
          if (Math.abs(scrollPercent - lastScrollPosition) > 0.01) {
            lastScrollPosition = scrollPercent;
            console.log('[WebView] Scroll:', Math.round(scrollPercent * 100) + '%');
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'scroll',
              position: scrollPercent
            }));
          }
        }, 500);
      });
      
      true;
    })();
  `;

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'scroll') {
        console.log('[ChapterFileViewer] Scroll event received:', Math.round(data.position * 100) + '%');
        saveProgress({ scrollPosition: data.position });

        if (data.position >= 0.9) {
          saveProgress({ scrollPosition: 1.0, completed: true });
        }
      }
    } catch (error) {
      console.error('[ChapterFileViewer] Failed to parse message:', error);
    }
  };

  // Always use Google Docs Viewer for scroll tracking support
  // Even if file is cached, we still use remote URL for viewing
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  return (
    <View style={styles.container}>
      {(loading || caching) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>{caching ? `Đang tải xuống ${fileName}...` : `Đang mở ${fileName}...`}</Text>
          {progress && progress.scrollPosition > 0 && (
            <Text style={styles.progressText}>Đã đọc {Math.round(progress.scrollPosition * 100)}%</Text>
          )}
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleOpenExternal} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Mở bằng ứng dụng khác</Text>
          </TouchableOpacity>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: viewerUrl }}
        style={styles.webview}
        onLoadStart={() => {
          console.log('[ChapterFileViewer] Loading PDF:', fileName);
          setLoading(true);
        }}
        onLoadEnd={() => {
          console.log('[ChapterFileViewer] PDF loaded successfully');
          setLoading(false);
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[ChapterFileViewer] WebView error:', nativeEvent);
          setLoading(false);
          setError('Không thể tải file. Vui lòng thử mở bằng ứng dụng khác.');
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[ChapterFileViewer] HTTP error:', nativeEvent.statusCode);
          setLoading(false);
          setError(`Lỗi tải file (${nativeEvent.statusCode}). Vui lòng thử lại.`);
        }}
        onMessage={handleWebViewMessage}
        injectedJavaScript={injectedJavaScript}
        startInLoadingState={true}
        scalesPageToFit={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        originWhitelist={['*']}
      />

      {/* Progress indicator */}
      {!loading && progress && progress.scrollPosition > 0 && (
        <View style={styles.progressIndicator}>
          <View style={[styles.progressBar, { width: `${progress.scrollPosition * 100}%` }]} />
        </View>
      )}

      {/* Floating buttons */}
      <View style={styles.floatingButtons}>
        {cachedFilePath && (
          <View style={styles.cachedBadge}>
            <Text style={styles.cachedBadgeText}>📥 Cached</Text>
          </View>
        )}
        <TouchableOpacity onPress={handleOpenExternal} style={styles.floatingButton}>
          <Text style={styles.floatingButtonText}>📱 Mở app khác</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1f3a',
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1f3a',
    zIndex: 1,
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },
  progressText: {
    color: '#F59E0B',
    marginTop: 8,
    fontSize: 12,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1f3a',
    padding: 20,
    zIndex: 1,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#F59E0B',
  },
  floatingButtons: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    gap: 10,
  },
  cachedBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-end',
  },
  cachedBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  floatingButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
