import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mindmapService } from '../../services/api/mindmap.service';
import { MindMapNode, MindMapStructure } from '../../types/mindmap';

interface MindmapScreenProps {
  chapterId: number;
  bookId: number;
}

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

export const MindmapScreen: React.FC<MindmapScreenProps> = ({ chapterId, bookId }) => {
  const [loading, setLoading] = useState(true);
  const [structure, setStructure] = useState<MindMapStructure | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMindmap();
  }, [chapterId, bookId]);

  const fetchMindmap = async () => {
    try {
      setLoading(true);
      const data = await mindmapService.getMindmapByChapter(bookId, chapterId);
      setStructure(data.structure);
    } catch (err) {
      setError('Không thể tải mindmap');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (error || !structure) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error || 'Chưa có mindmap'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{structure.centerNode.text}</Text>
      <TreeNode node={structure.centerNode} depth={0} allNodes={structure.nodes} />
    </ScrollView>
  );
};

function getColorByDepth(depth: number): string {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
  return colors[depth % colors.length];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  nodeContainer: {
    marginVertical: 4,
  },
  node: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    fontWeight: '500',
    flex: 1,
  },
});
