import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OrderingItem {
  id: string;
  text: string;
}

interface OrderingProps {
  items: OrderingItem[];
  selectedOrder: string[];
  onAnswer: (order: string[]) => void;
}

export function OrderingQuestion({ items, selectedOrder, onAnswer }: OrderingProps) {
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...selectedOrder];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    onAnswer(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === selectedOrder.length - 1) return;
    const newOrder = [...selectedOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onAnswer(newOrder);
  };

  const getItemText = (id: string) => {
    return items.find((item) => item.id === id)?.text || id;
  };

  // Initialize order if empty
  React.useEffect(() => {
    if (selectedOrder.length === 0) {
      onAnswer(items.map((item) => item.id));
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.hint}>
        <Ionicons name="swap-vertical" size={16} color="#3b82f6" />
        <Text style={styles.hintText}>Sắp xếp các mục theo thứ tự đúng</Text>
      </View>

      {selectedOrder.map((itemId, index) => (
        <View key={itemId} style={styles.orderItem}>
          <View style={styles.orderNumber}>
            <Text style={styles.orderNumberText}>{index + 1}</Text>
          </View>

          <Text style={styles.itemText}>{getItemText(itemId)}</Text>

          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlButton, index === 0 && styles.controlButtonDisabled]}
              onPress={() => moveUp(index)}
              disabled={index === 0}
            >
              <Ionicons name="chevron-up" size={20} color={index === 0 ? '#64748b' : '#fff'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, index === selectedOrder.length - 1 && styles.controlButtonDisabled]}
              onPress={() => moveDown(index)}
              disabled={index === selectedOrder.length - 1}
            >
              <Ionicons name="chevron-down" size={20} color={index === selectedOrder.length - 1 ? '#64748b' : '#fff'} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
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
    fontSize: 13,
    color: '#93c5fd',
    fontWeight: '500',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  orderNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    color: '#e2e8f0',
  },
  controls: {
    flexDirection: 'row',
    gap: 4,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.3,
  },
});
