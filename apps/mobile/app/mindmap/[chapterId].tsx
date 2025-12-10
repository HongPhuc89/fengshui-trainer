import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSizes, spacing } from '@/constants';
import { mindMapService } from '@/modules/shared/services/api';
import { MindMap, MindMapNode } from '@/modules/shared/services/api/types';

const { width } = Dimensions.get('window');

interface NodeProps {
  node: MindMapNode;
  level: number;
  isExpanded: boolean;
  onToggle: () => void;
}

const MindMapNodeComponent: React.FC<NodeProps> = ({ node, level, isExpanded, onToggle }) => {
  const hasChildren = node.children && node.children.length > 0;
  const colors = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];
  const nodeColor = colors[level % colors.length];

  return (
    <View style={styles.nodeContainer}>
      <TouchableOpacity
        style={[styles.node, { borderLeftColor: nodeColor, marginLeft: level * 20 }]}
        onPress={hasChildren ? onToggle : undefined}
        activeOpacity={hasChildren ? 0.7 : 1}
      >
        <View style={styles.nodeContent}>
          <View style={[styles.nodeDot, { backgroundColor: nodeColor }]} />
          <Text style={styles.nodeLabel}>{node.label}</Text>
          {hasChildren && <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={20} color="#9CA3AF" />}
        </View>
        {node.metadata?.description && <Text style={styles.nodeDescription}>{node.metadata.description}</Text>}
      </TouchableOpacity>

      {hasChildren && isExpanded && (
        <View style={styles.childrenContainer}>
          {node.children!.map((child, index) => (
            <MindMapNodeWrapper key={child.id || index} node={child} level={level + 1} />
          ))}
        </View>
      )}
    </View>
  );
};

const MindMapNodeWrapper: React.FC<{ node: MindMapNode; level: number }> = ({ node, level }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

  return (
    <MindMapNodeComponent
      node={node}
      level={level}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
    />
  );
};

export default function MindMapScreen() {
  const { chapterId, bookId } = useLocalSearchParams<{ chapterId: string; bookId: string }>();
  const router = useRouter();
  const [mindMap, setMindMap] = useState<MindMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);

  useEffect(() => {
    loadMindMap();
  }, [chapterId]);

  const loadMindMap = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const chapterIdNum = parseInt(chapterId as string);
      const bookIdNum = parseInt(bookId as string);
      const data = await mindMapService.getMindMapByChapter(bookIdNum, chapterIdNum);
      setMindMap(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải sơ đồ tư duy');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <LinearGradient colors={['#1a1f3a', '#2d1f3a', '#3a1f2d']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={styles.loadingText}>Đang tải sơ đồ...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error || !mindMap) {
    return (
      <LinearGradient colors={['#1a1f3a', '#2d1f3a', '#3a1f2d']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Sơ Đồ Tư Duy</Text>
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="git-network-outline" size={64} color="#F59E0B" />
            <Text style={styles.errorText}>{error || 'Chưa có sơ đồ cho chương này'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadMindMap}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1f3a', '#2d1f3a', '#3a1f2d']} style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sơ Đồ Tư Duy</Text>
        </View>

        {/* Mind Map Info */}
        <View style={styles.infoCard}>
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)'] as [string, string, ...string[]]}
            style={styles.infoCardGradient}
          >
            <View style={styles.infoHeader}>
              <Ionicons name="git-network" size={24} color="#10B981" />
              <Text style={styles.infoTitle}>{mindMap.title}</Text>
            </View>
            {mindMap.description && <Text style={styles.infoDescription}>{mindMap.description}</Text>}
          </LinearGradient>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={() => setExpandAll(!expandAll)}>
            <Ionicons name={expandAll ? 'contract-outline' : 'expand-outline'} size={20} color="#F59E0B" />
            <Text style={styles.controlButtonText}>{expandAll ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}</Text>
          </TouchableOpacity>
        </View>

        {/* Mind Map Tree */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.treeContainer}>
            <MindMapNodeWrapper node={mindMap.structure} level={0} />
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: spacing.sm,
  },

  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.base,
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: fontSizes.base,
    color: '#fff',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: fontSizes.base,
    fontWeight: '600',
  },

  // Info Card
  infoCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  infoCardGradient: {
    padding: spacing.lg,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoTitle: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: '#fff',
    marginLeft: spacing.sm,
  },
  infoDescription: {
    fontSize: fontSizes.sm,
    color: '#D1D5DB',
    lineHeight: 20,
  },

  // Controls
  controls: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  controlButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: spacing.xs,
  },

  // Content
  content: {
    flex: 1,
  },
  treeContainer: {
    paddingHorizontal: spacing.lg,
  },

  // Node
  nodeContainer: {
    marginBottom: spacing.xs,
  },
  node: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  nodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nodeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  nodeLabel: {
    flex: 1,
    fontSize: fontSizes.base,
    fontWeight: '600',
    color: '#fff',
  },
  nodeDescription: {
    fontSize: fontSizes.sm,
    color: '#9CA3AF',
    marginTop: spacing.xs,
    marginLeft: 20,
    lineHeight: 18,
  },
  childrenContainer: {
    marginTop: spacing.xs,
  },

  // Bottom Spacing
  bottomSpacer: {
    height: 40,
  },
});
