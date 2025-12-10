import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { mindmapService } from '../../services/api/mindmap.service';
import { MindMapNode, MindMapStructure } from '../../types/mindmap';

interface TreeNodeProps {
  node: MindMapNode;
  depth: number;
  allNodes: MindMapNode[];
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth, allNodes }) => {
  const [collapsed, setCollapsed] = useState(node.collapsed || false);
  const children = allNodes.filter((n) => n.parentId === node.id);
  const hasChildren = children.length > 0;

  const indent = depth * 20;
  const backgroundColor = node.color || getColorByDepth(depth);

  return (
    <View style={[styles.nodeContainer, { marginLeft: indent }]}>
      <TouchableOpacity
        style={[styles.node, { backgroundColor }]}
        onPress={() => hasChildren && setCollapsed(!collapsed)}
        activeOpacity={0.8}
      >
        <View style={styles.nodeContent}>
          {node.icon && <Text style={styles.icon}>{node.icon}</Text>}
          <Text style={styles.nodeText}>{node.text}</Text>
        </View>
        {hasChildren && <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={20} color="#fff" />}
      </TouchableOpacity>

      {!collapsed &&
        children.map((child) => <TreeNode key={child.id} node={child} depth={depth + 1} allNodes={allNodes} />)}
    </View>
  );
};

export default function MindmapScreen() {
  const { chapterId, bookId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [structure, setStructure] = useState<MindMapStructure | null>(null);
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
      const data = await mindmapService.getMindmapByChapter(Number(bookId), Number(chapterId));
      setStructure(data.structure);
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

  if (error || !structure) {
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
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title || 'Mindmap'}
        </Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="expand" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.centerNodeTitle}>{structure.centerNode.text}</Text>

          <View style={styles.treeContainer}>
            <TreeNode node={structure.centerNode} depth={0} allNodes={structure.nodes} />
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#6366f1" />
          <Text style={styles.infoText}>Nhấn vào node để mở rộng/thu gọn các nhánh</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function getColorByDepth(depth: number): string {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
  return colors[depth % colors.length];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  centerNodeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  treeContainer: {
    marginTop: 8,
  },
  nodeContainer: {
    marginVertical: 4,
  },
  node: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  nodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  nodeText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
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
