import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Linking, Dimensions } from 'react-native';

// Try dynamic import to catch errors
let Pdf: any;
try {
  Pdf = require('react-native-pdf').default;
} catch (error) {
  console.error('Failed to load react-native-pdf:', error);
}

interface ChapterFileViewerProps {
  fileUrl: string;
  fileName: string;
}

export function ChapterFileViewer({ fileUrl, fileName }: ChapterFileViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const handleOpenExternal = () => {
    Linking.openURL(fileUrl);
  };

  // If Pdf component failed to load, show error
  if (!Pdf) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>PDF viewer không khả dụng. Vui lòng mở file bằng ứng dụng khác.</Text>
        <TouchableOpacity onPress={handleOpenExternal} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Mở bằng ứng dụng khác</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Đang tải {fileName}...</Text>
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

      {!error && (
        <>
          <Pdf
            source={{ uri: fileUrl, cache: true }}
            style={styles.pdf}
            onLoadComplete={(numberOfPages: number) => {
              console.log(`PDF loaded: ${numberOfPages} pages`);
              setNumPages(numberOfPages);
              setLoading(false);
            }}
            onPageChanged={(page: number, numberOfPages: number) => {
              console.log(`Current page: ${page}/${numberOfPages}`);
              setCurrentPage(page);
            }}
            onError={(error: any) => {
              console.error('PDF load error:', error);
              setLoading(false);
              setError('Không thể tải file PDF. Vui lòng thử lại sau.');
            }}
            onLoadProgress={(percent: number) => {
              console.log(`Loading: ${Math.round(percent * 100)}%`);
            }}
            enablePaging={true}
            horizontal={false}
            spacing={10}
            fitPolicy={0}
          />

          {!loading && numPages > 0 && (
            <View style={styles.pageIndicator}>
              <Text style={styles.pageText}>
                Trang {currentPage} / {numPages}
              </Text>
            </View>
          )}
        </>
      )}
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
    width: Dimensions.get('window').width,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1f3a',
    padding: 20,
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
  pageIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pageText: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '600',
  },
});
