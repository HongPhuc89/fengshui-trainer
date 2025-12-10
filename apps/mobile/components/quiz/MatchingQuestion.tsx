import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MatchingPair {
  left: string;
  right: string;
}

interface MatchingProps {
  pairs: MatchingPair[];
  selectedMatches: Record<string, string>;
  onAnswer: (matches: Record<string, string>) => void;
}

export function MatchingQuestion({ pairs, selectedMatches, onAnswer }: MatchingProps) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const leftItems = pairs.map((p) => p.left);
  const rightItems = [...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5);

  const handleLeftClick = (item: string) => {
    setSelectedLeft(item);
  };

  const handleRightClick = (item: string) => {
    if (selectedLeft) {
      const newMatches = { ...selectedMatches, [selectedLeft]: item };
      onAnswer(newMatches);
      setSelectedLeft(null);
    }
  };

  const getMatchedRight = (leftItem: string) => selectedMatches[leftItem];
  const isRightMatched = (rightItem: string) => Object.values(selectedMatches).includes(rightItem);

  return (
    <View style={styles.container}>
      <View style={styles.hint}>
        <Ionicons name="link" size={16} color="#3b82f6" />
        <Text style={styles.hintText}>Chọn cặp từ bên trái, sau đó chọn cặp từ bên phải</Text>
      </View>

      <View style={styles.matchingGrid}>
        <View style={styles.column}>
          <Text style={styles.columnTitle}>Cột A</Text>
          {leftItems.map((item, index) => {
            const isSelected = selectedLeft === item;
            const matchedRight = getMatchedRight(item);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.matchItem,
                  styles.leftItem,
                  isSelected && styles.selectedItem,
                  matchedRight && styles.matchedItem,
                ]}
                onPress={() => handleLeftClick(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.matchText, (isSelected || matchedRight) && styles.matchTextActive]}>{item}</Text>
                {matchedRight && <Ionicons name="link" size={16} color="#10b981" style={styles.linkIcon} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.divider} />

        <View style={styles.column}>
          <Text style={styles.columnTitle}>Cột B</Text>
          {rightItems.map((item, index) => {
            const isMatched = isRightMatched(item);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.matchItem,
                  styles.rightItem,
                  isMatched && styles.matchedItem,
                  !selectedLeft && styles.disabledItem,
                ]}
                onPress={() => handleRightClick(item)}
                disabled={!selectedLeft || isMatched}
                activeOpacity={0.7}
              >
                <Text style={[styles.matchText, isMatched && styles.matchTextActive]}>{item}</Text>
                {isMatched && <Ionicons name="checkmark-circle" size={16} color="#10b981" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: '#93c5fd',
    fontWeight: '500',
  },
  matchingGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  columnTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 8,
    textAlign: 'center',
  },
  matchItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftItem: {},
  rightItem: {},
  selectedItem: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3b82f6',
  },
  matchedItem: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
  },
  disabledItem: {
    opacity: 0.5,
  },
  matchText: {
    flex: 1,
    fontSize: 14,
    color: '#e2e8f0',
  },
  matchTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  linkIcon: {
    marginLeft: 4,
  },
  divider: {
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 24,
  },
});
