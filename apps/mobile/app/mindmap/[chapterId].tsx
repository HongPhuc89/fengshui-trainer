import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { mindMapService } from '../../modules/shared/services/api';

const { width, height } = Dimensions.get('window');

export default function MindmapScreen() {
  const { chapterId, bookId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [markdownContent, setMarkdownContent] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (chapterId && bookId) {
      fetchMindmap();
    }
  }, [chapterId, bookId]);

  const fetchMindmap = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🗺️ Fetching mindmap for book:', bookId, 'chapter:', chapterId);
      const data = await mindMapService.getMindMapByChapter(Number(bookId), Number(chapterId));

      if (data.markdown_content) {
        setMarkdownContent(data.markdown_content);
      } else {
        // Fallback to structure if markdown not available
        setMarkdownContent(convertStructureToMarkdown(data.structure));
      }

      setTitle(data.title);
    } catch (err: any) {
      console.error('Error fetching mindmap:', err);

      if (err.response?.status === 404) {
        setError('Chưa có mindmap cho chương này.\nVui lòng tạo mindmap trong trang Admin.');
      } else if (err.response?.status === 403) {
        setError('Mindmap chưa được kích hoạt hoặc sách chưa được xuất bản.');
      } else {
        setError(err.response?.data?.message || 'Không thể tải mindmap. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Convert old structure format to markdown (for backward compatibility)
  const convertStructureToMarkdown = (structure: any): string => {
    if (!structure) return '# No Content';

    let markdown = `# ${structure.centerNode?.text || 'Main Topic'}\n\n`;

    if (structure.nodes && structure.nodes.length > 0) {
      const nodesByParent = new Map<string, any[]>();

      structure.nodes.forEach((node: any) => {
        const parentId = node.parentId || 'root';
        if (!nodesByParent.has(parentId)) {
          nodesByParent.set(parentId, []);
        }
        nodesByParent.get(parentId)!.push(node);
      });

      const renderNodes = (parentId: string, level: number = 2) => {
        const children = nodesByParent.get(parentId) || [];
        children.forEach((node: any) => {
          const prefix = level === 2 ? '##' : '-';
          const indent = level > 2 ? '  '.repeat(level - 3) : '';
          markdown += `${indent}${prefix} ${node.text}\n`;
          renderNodes(node.id, level + 1);
        });
      };

      renderNodes('root');
    }

    return markdown;
  };

  const generateMarkmapHTML = (markdown: string) => {
    const sanitizedMarkdown = markdown.replace(/\r/g, '');
    const markdownInJs = sanitizedMarkdown.replace(/`/g, '\\`').replace(/\$/g, '\\$');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      overflow: hidden;
      width: 100vw;
      height: 100vh;
    }
    #mindmap {
      width: 100vw;
      height: 100vh;
    }
    svg {
      width: 100%;
      height: 100%;
      background: transparent;
    }
    /* Customize markmap styles */
    .markmap-node {
      cursor: pointer;
    }
    .markmap-node circle {
      fill: #fff;
      stroke-width: 2;
    }
    .markmap-node text {
      fill: #fff;
      font-size: 14px;
      font-weight: 600;
    }
    .markmap-link {
      stroke: rgba(255, 255, 255, 0.6);
      stroke-width: 2;
    }
    .markmap-toolbar {
      position: absolute;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-view@0.18"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-lib@0.18"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-toolbar@0.18"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/markmap-toolbar@0.18/dist/style.css">
</head>
<body>
  <svg id="mindmap"></svg>
  <script>
    try {
      function startMarkmap() {
        const markmap = window.markmap;
        const markmapView = window.markmapView;
        const markmapToolbar = window.markmapToolbar;
        
        if (!markmap || (!markmapView && !markmap.Markmap) || !markmapToolbar) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ 
            type: 'log', 
            message: 'Waiting for markmap dependencies...' 
          }));
          setTimeout(startMarkmap, 100);
          return;
        }

        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: 'Dependencies ready' }));

        const { Transformer } = markmap;
        const Markmap = (markmapView && markmapView.Markmap) || markmap.Markmap;
        const { Toolbar } = markmapToolbar;

        if (!Markmap || !Transformer || !Toolbar) {
          throw new Error('Could not find Markmap, Transformer or Toolbar in globals');
        }

        const markdown = \`${markdownInJs}\`;

        const transformer = new Transformer();
        const { root } = transformer.transform(markdown);

        const svg = document.getElementById('mindmap');
        const mm = Markmap.create(svg, {
          color: (node) => {
            const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
            return colors[node.depth % colors.length];
          },
          duration: 500,
          maxWidth: 300,
          paddingX: 20,
          autoFit: true,
          zoom: true,
          pan: true,
        }, root);

        // Add Toolbar
        const toolbar = Toolbar.create(mm);
        toolbar.attach(document.body);

        // Auto-fit on load
        setTimeout(() => {
          mm.fit();
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: 'Mindmap rendered and fitted' }));
        }, 200);

        // Handle window resize
        window.addEventListener('resize', () => {
          mm.fit();
        });
      }

      // Start the initialization
      if (document.readyState === 'complete') {
        startMarkmap();
      } else {
        window.addEventListener('load', startMarkmap);
      }
    } catch (e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: e.message, stack: e.stack }));
    }
  </script>
</body>
</html>
    `;
  };

  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Đang tải mindmap...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error || !markdownContent) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mindmap</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={64} color="#fff" />
          <Text style={styles.errorText}>{error || 'Chưa có mindmap cho chương này'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchMindmap}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title || 'Mindmap'}
        </Text>
        <TouchableOpacity style={styles.iconButton} onPress={fetchMindmap}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Markmap WebView */}
      <WebView
        source={{ html: generateMarkmapHTML(markdownContent) }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        scalesPageToFit={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'log') {
              console.log('🌐 [WebView Log]:', data.message);
            } else if (data.type === 'error') {
              console.error('🌐 [WebView Error]:', data.message, data.stack);
            }
          } catch (e) {
            console.log('🌐 [WebView Message]:', event.nativeEvent.data);
          }
        }}
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="large" color="#667eea" />
          </View>
        )}
      />

      {/* Info Footer */}
      <View style={styles.infoFooter}>
        <Ionicons name="information-circle" size={20} color="#6366f1" />
        <Text style={styles.infoText}>Chạm và kéo để xem toàn bộ mindmap • Nhấn vào node để mở rộng</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  infoText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
});
