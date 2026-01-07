import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import Pdf from 'react-native-pdf';
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
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const pdfRef = useRef<any>(null);
  const { progress, saveProgress } = useReadingProgress(chapterId);

  // Wait for progress to load before rendering PDF
  useEffect(() => {
    if (progress !== null) {
      // Progress loaded (either has data or confirmed no data)
      if (progress.scrollPosition > 0 && totalPages > 0) {
        // Calculate initial page from saved progress BEFORE rendering PDF
        const initialPage = Math.max(1, Math.floor(progress.scrollPosition * totalPages));
        console.log(
          '[ChapterFileViewer] 📊 Calculating initial page:',
          initialPage,
          'from position:',
          progress.scrollPosition,
        );
        setCurrentPage(initialPage);
      }
      setIsReady(true);
    }
  }, [progress, totalPages]);

  // Load cached file or use URL
  useEffect(() => {
    loadFile();
    setIsReady(false); // Reset ready flag when file changes
    setIsInitialLoad(true); // Reset initial load flag
  }, [fileUrl, fileId, fileUpdatedAt]);

  const loadFile = async () => {
    // If we have fileId and updatedAt, try to cache file in background
    if (fileId && fileUpdatedAt) {
      try {
        setCaching(true);
        const localPath = await offlineCacheService.getFile(fileUrl, fileId, fileName, fileUpdatedAt);

        if (localPath) {
          setCachedFilePath(localPath);
          console.log('[ChapterFileViewer] File cached for offline use:', localPath);
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

  const handleLoadComplete = (numberOfPages: number, filePath: string) => {
    console.log('[ChapterFileViewer] PDF loaded:', numberOfPages, 'pages');
    console.log('[ChapterFileViewer] Current progress:', progress);

    setLoading(false);
    setTotalPages(numberOfPages);
    setError(null);

    // Calculate and set initial page
    if (progress && progress.scrollPosition > 0) {
      const savedPage = Math.max(1, Math.floor(progress.scrollPosition * numberOfPages));
      console.log('[ChapterFileViewer] 🎯 Setting initial page:', savedPage, '/', numberOfPages);
      setCurrentPage(savedPage);

      // Allow page changes to be saved after a short delay
      setTimeout(() => {
        setIsInitialLoad(false);
        console.log('[ChapterFileViewer] ✅ Initial load complete, now tracking changes');
      }, 1000);
    } else {
      setIsInitialLoad(false);
    }
  };

  const handlePageChanged = (page: number, numberOfPages: number) => {
    console.log('[ChapterFileViewer] Page changed:', page, '/', numberOfPages, '| isInitialLoad:', isInitialLoad);

    // Skip saving during initial load
    if (isInitialLoad) {
      console.log('[ChapterFileViewer] ⏭️ Skipping save during initial load');
      return;
    }

    setCurrentPage(page);

    // Calculate scroll position based on page number
    const scrollPosition = page / numberOfPages;
    saveProgress({ scrollPosition });

    // Mark as completed when reaching last page
    if (page === numberOfPages) {
      console.log('[ChapterFileViewer] Reached last page, marking as completed');
      saveProgress({ scrollPosition: 1.0, completed: true });
    }
  };

  const handleError = (error: any) => {
    console.error('[ChapterFileViewer] PDF error:', error);
    setLoading(false);
    setError('Không thể tải PDF. Vui lòng thử mở bằng ứng dụng khác.');
  };

  // Use remote URL (don't use cached file for now to avoid issues)
  const pdfSource = { uri: fileUrl, cache: true };

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

      {!error && isReady && (
        <Pdf
          ref={pdfRef}
          key={`pdf-${chapterId}-${fileUrl}`}
          source={pdfSource}
          page={currentPage}
          onLoadComplete={handleLoadComplete}
          onPageChanged={handlePageChanged}
          onError={handleError}
          style={styles.pdf}
          trustAllCerts={false}
          enablePaging={true}
          horizontal={false}
          spacing={10}
          fitPolicy={0}
        />
      )}

      {/* Progress indicator */}
      {!loading && totalPages > 0 && (
        <View style={styles.progressIndicator}>
          <View style={[styles.progressBar, { width: `${(currentPage / totalPages) * 100}%` }]} />
        </View>
      )}

      {/* Page counter */}
      {!loading && totalPages > 0 && (
        <View style={styles.pageCounter}>
          <Text style={styles.pageCounterText}>
            {currentPage} / {totalPages}
          </Text>
        </View>
      )}

      {/* Floating buttons */}
      <View style={styles.floatingButtons}>
        {cachedFilePath && (
          <View style={styles.cachedBadge}>
            <Text style={styles.cachedBadgeText}>📥 Offline</Text>
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
  pdf: {
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
  pageCounter: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
