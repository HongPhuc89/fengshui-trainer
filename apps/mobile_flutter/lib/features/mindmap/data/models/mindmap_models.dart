import 'package:equatable/equatable.dart';

/// MindMap node model representing a node in the tree structure
class MindMapNode extends Equatable {

  const MindMapNode({
    required this.id,
    required this.label,
    this.children,
    this.metadata,
  });

  factory MindMapNode.fromJson(Map<String, dynamic> json) {
    return MindMapNode(
      id: json['id'] as String,
      label: json['label'] as String,
      children: json['children'] != null
          ? (json['children'] as List)
              .map((child) =>
                  MindMapNode.fromJson(child as Map<String, dynamic>),)
              .toList()
          : null,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }
  final String id;
  final String label;
  final List<MindMapNode>? children;
  final Map<String, dynamic>? metadata;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': label,
      if (children != null)
        'children': children!.map((c) => c.toJson()).toList(),
      if (metadata != null) 'metadata': metadata,
    };
  }

  /// Get total number of nodes in this subtree
  int get nodeCount {
    int count = 1; // Count this node
    if (children != null) {
      for (final child in children!) {
        count += child.nodeCount;
      }
    }
    return count;
  }

  /// Get maximum depth of this subtree
  int get maxDepth {
    if (children == null || children!.isEmpty) {
      return 1;
    }
    int maxChildDepth = 0;
    for (final child in children!) {
      final childDepth = child.maxDepth;
      if (childDepth > maxChildDepth) {
        maxChildDepth = childDepth;
      }
    }
    return 1 + maxChildDepth;
  }

  /// Check if this node has children
  bool get hasChildren => children != null && children!.isNotEmpty;

  @override
  List<Object?> get props => [id, label, children, metadata];
}

/// MindMap model representing the complete mindmap
class MindMap extends Equatable {

  const MindMap({
    required this.id,
    required this.chapterId,
    required this.title,
    required this.structure, required this.createdAt, required this.updatedAt, this.description,
  });

  factory MindMap.fromJson(Map<String, dynamic> json) {
    return MindMap(
      id: json['id'] as int,
      chapterId: json['chapter_id'] as int? ?? json['chapterId'] as int,
      title: json['title'] as String,
      description: json['description'] as String?,
      structure:
          MindMapNode.fromJson(json['structure'] as Map<String, dynamic>),
      createdAt: DateTime.parse(
          json['created_at'] as String? ?? json['createdAt'] as String,),
      updatedAt: DateTime.parse(
          json['updated_at'] as String? ?? json['updatedAt'] as String,),
    );
  }
  final int id;
  final int chapterId;
  final String title;
  final String? description;
  final MindMapNode structure;
  final DateTime createdAt;
  final DateTime updatedAt;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'chapter_id': chapterId,
      'title': title,
      if (description != null) 'description': description,
      'structure': structure.toJson(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  /// Get total number of nodes in the mindmap
  int get totalNodes => structure.nodeCount;

  /// Get maximum depth of the mindmap
  int get maxDepth => structure.maxDepth;

  @override
  List<Object?> get props => [id, chapterId, title, description, structure];
}
