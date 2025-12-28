import React, { useState, useMemo } from 'react';
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
  disabled?: boolean;
}

const PAIR_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export function MatchingQuestion({ pairs, selectedMatches, onAnswer, disabled = false }: MatchingProps) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  // Memoize shuffled right items to prevent re-shuffle on every render
  const rightItems = useMemo(() => {
    return [...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5);
  }, [pairs]);

  const leftItems = pairs.map((p) => p.left);

  // Get color for a left item based on its index
  const getLeftColor = (leftItem: string) => {
    const index = leftItems.indexOf(leftItem);
    return PAIR_COLORS[index % PAIR_COLORS.length];
  };

  // Get color for a right item if it's matched
  const getRightColor = (rightItem: string) => {
    // Find which left item matched this right item
    const leftItem = Object.keys(selectedMatches).find((left) => selectedMatches[left] === rightItem);
    if (leftItem) {
      return getLeftColor(leftItem);
    }
    return null;
  };

  const handleLeftClick = (item: string) => {
    if (disabled) return;
    setSelectedLeft(item);
  };

  const handleRightClick = (item: string) => {
    if (disabled) return;
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
        <Ionicons name={disabled ? 'lock-closed' : 'link'} size={16} color={disabled ? '#10b981' : '#3b82f6'} />
        <Text style={styles.hintText}>
          {disabled ? 'Đã xác nhận các cặp' : 'Chọn cặp từ bên trái, sau đó chọn cặp từ bên phải'}
        </Text>
      </View>

      <View style={styles.matchingGrid}>
        <View style={styles.column}>
          <Text style={styles.columnTitle}>Cột A</Text>
          {leftItems.map((item, index) => {
            const isSelected = selectedLeft === item;
            const matchedRight = getMatchedRight(item);
            const color = getLeftColor(item);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.matchItem,
                  styles.leftItem,
                  { borderColor: color, borderWidth: 2 },
                  isSelected && { backgroundColor: `${color}20` },
                  matchedRight && { backgroundColor: `${color}30` },
                  disabled && styles.disabledItem,
                ]}
                onPress={() => handleLeftClick(item)}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <Text style={[styles.matchText, (isSelected || matchedRight) && styles.matchTextActive]}>{item}</Text>
                {matchedRight && <Ionicons name="link" size={16} color={color} style={styles.linkIcon} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.divider} />

        <View style={styles.column}>
          <Text style={styles.columnTitle}>Cột B</Text>
          {rightItems.map((item, index) => {
            const isMatched = isRightMatched(item);
            const color = getRightColor(item);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.matchItem,
                  styles.rightItem,
                  color && { borderColor: color, borderWidth: 2, backgroundColor: `${color}30` },
                  !color && { borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 2 },
                  (!selectedLeft || disabled) && styles.disabledItem,
                ]}
                onPress={() => handleRightClick(item)}
                disabled={!selectedLeft || isMatched || disabled}
                activeOpacity={0.7}
              >
                <Text style={[styles.matchText, isMatched && styles.matchTextActive]}>{item}</Text>
                {isMatched && <Ionicons name="checkmark-circle" size={16} color={color || '#10b981'} />}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftItem: {},
  rightItem: {},
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
