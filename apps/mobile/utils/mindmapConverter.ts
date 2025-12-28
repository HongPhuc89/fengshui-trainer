import { MindMapStructure, MindMapNode } from '../types/mindmap';

/**
 * Convert MindMap structure to Markdown format for Markmap
 */
export function convertMindmapToMarkdown(structure: MindMapStructure): string {
  if (!structure || !structure.centerNode) {
    return '# Empty Mindmap';
  }

  const lines: string[] = [];

  // Add title from center node
  lines.push(`# ${structure.centerNode.text}`);

  // Build tree structure
  const nodeMap = new Map<string, MindMapNode>();
  nodeMap.set(structure.centerNode.id, structure.centerNode);

  structure.nodes.forEach((node) => {
    nodeMap.set(node.id, node);
  });

  // Recursive function to build markdown
  function buildMarkdown(nodeId: string, depth: number = 1): void {
    const children = structure.nodes.filter((n) => n.parentId === nodeId);

    children.forEach((child) => {
      const indent = '  '.repeat(depth);
      const marker = '#'.repeat(depth + 1);
      lines.push(`${indent}${marker} ${child.text}`);

      // Add metadata as sub-items if exists
      if (child.metadata) {
        Object.entries(child.metadata).forEach(([key, value]) => {
          lines.push(`${indent}  - ${key}: ${value}`);
        });
      }

      // Recursively add children
      buildMarkdown(child.id, depth + 1);
    });
  }

  // Start from center node
  buildMarkdown(structure.centerNode.id);

  return lines.join('\n');
}

/**
 * Generate sample markdown for testing
 */
export function getSampleMindmapMarkdown(): string {
  return `# Chương 1: Giới thiệu

## 1.1 Khái niệm cơ bản
- Định nghĩa
- Phân loại
- Ứng dụng

## 1.2 Lịch sử phát triển
- Giai đoạn 1: 1900-1950
- Giai đoạn 2: 1950-2000
- Giai đoạn 3: 2000-nay

## 1.3 Các nguyên lý
### 1.3.1 Nguyên lý thứ nhất
- Chi tiết 1
- Chi tiết 2

### 1.3.2 Nguyên lý thứ hai
- Chi tiết A
- Chi tiết B
`;
}
