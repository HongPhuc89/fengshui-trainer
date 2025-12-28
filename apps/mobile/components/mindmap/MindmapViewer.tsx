import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';

interface MindmapViewerProps {
  chapterId: number;
  markdownContent?: string;
}

export const MindmapViewer: React.FC<MindmapViewerProps> = ({ chapterId, markdownContent }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const markmapRef = useRef<Markmap | null>(null);

  useEffect(() => {
    if (!svgRef.current || !markdownContent) return;

    // Transform markdown to markmap data
    const transformer = new Transformer();
    const { root } = transformer.transform(markdownContent);

    // Create or update markmap
    if (!markmapRef.current) {
      markmapRef.current = Markmap.create(svgRef.current, {
        duration: 500,
        maxWidth: 300,
        color: (node) => {
          // Custom color based on depth
          const colors = ['#5B8FF9', '#61DDAA', '#F6BD16', '#7262FD', '#78D3F8'];
          return colors[node.state.depth % colors.length];
        },
      });
    }

    markmapRef.current.setData(root);
    markmapRef.current.fit();
  }, [markdownContent]);

  return (
    <View style={styles.container}>
      <svg ref={svgRef} style={styles.svg} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  svg: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 100,
  },
});
