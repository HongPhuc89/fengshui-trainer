import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

interface ChapterFileViewerProps {
  fileUrl: string;
  fileName: string;
}

export function ChapterFileViewer({ fileUrl, fileName }: ChapterFileViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleOpenExternal = () => {
    Linking.openURL(fileUrl);
  };

  // For iOS, we can load PDF directly
  // For Android, we need Google Docs Viewer
  const viewerUrl =
    Platform.OS === 'ios' ? fileUrl : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Đang tải {fileName}...</Text>
          <TouchableOpacity onPress={handleOpenExternal} style={styles.openButton}>
            <Text style={styles.openButtonText}>Mở bằng ứng dụng khác</Text>
          </TouchableOpacity>
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
        source={{ uri: viewerUrl }}
        style={styles.webview}
        onLoadStart={() => {
          console.log('WebView loading:', viewerUrl);
          setLoading(true);
        }}
        onLoadEnd={() => {
          console.log('WebView loaded');
          setLoading(false);
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          setLoading(false);
          setError('Không thể tải file. Vui lòng thử mở bằng ứng dụng khác.');
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error:', nativeEvent.statusCode);
          setLoading(false);
          setError(`Lỗi tải file (${nativeEvent.statusCode}). Link có thể đã hết hạn.`);
        }}
        onMessage={(event) => {
          console.log('WebView message:', event.nativeEvent.data);
        }}
        startInLoadingState={true}
        scalesPageToFit={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        originWhitelist={['*']}
      />
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
  openButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
  },
  openButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
});
