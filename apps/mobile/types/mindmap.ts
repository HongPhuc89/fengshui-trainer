export interface MindMapNode {
  id: string;
  parentId?: string;
  text: string;
  color?: string;
  icon?: string;
  position?: { x: number; y: number };
  collapsed?: boolean;
  metadata?: Record<string, any>;
}

export interface MindMapConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: 'parent-child' | 'related' | 'opposed';
  label?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface MindMapTheme {
  fontFamily?: string;
  fontSize?: number;
  lineColor?: string;
  backgroundColor?: string;
}

export interface MindMapStructure {
  version: string;
  layout: 'radial' | 'tree' | 'org-chart';
  centerNode: MindMapNode;
  nodes: MindMapNode[];
  connections?: MindMapConnection[];
  theme?: MindMapTheme;
}

export interface MindMap {
  id: number;
  chapter_id: number;
  title: string;
  description?: string;
  structure: MindMapStructure;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
