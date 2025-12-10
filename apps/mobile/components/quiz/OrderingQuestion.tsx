import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface OrderingItem {
  id: string;
  text: string;
}

interface OrderingProps {
  items: OrderingItem[];
  selectedOrder: string[];
  onAnswer: (order: string[]) => void;
  disabled?: boolean;
}

interface DraggableItem {
  id: string;
  text: string;
  position: number;
}

export function OrderingQuestion({ items, selectedOrder, onAnswer, disabled = false }: OrderingProps) {
  const [data, setData] = useState<DraggableItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize data
  useEffect(() => {
    if (initialized) return;

    if (selectedOrder.length === 0) {
      // First time - use original order
      const initialData = items.map((item, index) => ({
        ...item,
        position: index + 1,
      }));
      setData(initialData);
      onAnswer(items.map((item) => item.id));
    } else {
      // Use selected order
      const orderedData = selectedOrder.map((id, index) => {
        const item = items.find((i) => i.id === id);
        return {
          id,
          text: item?.text || id,
          position: index + 1,
        };
      });
      setData(orderedData);
    }
    setInitialized(true);
  }, [items, selectedOrder, initialized]);

  const handleDragEnd = ({ data: newData }: { data: DraggableItem[] }) => {
    if (disabled) return;

    // Update positions
    const updatedData = newData.map((item, index) => ({
      ...item,
      position: index + 1,
    }));
    setData(updatedData);

    // Update answer
    const newOrder = updatedData.map((item) => item.id);
    onAnswer(newOrder);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<DraggableItem>) => {
    return (
      <ScaleDecorator>
        <View style={[styles.orderItem, isActive && styles.orderItemActive, disabled && styles.orderItemDisabled]}>
          <View style={styles.orderNumber}>
            <Text style={styles.orderNumberText}>{item.position}</Text>
          </View>

          <Text style={[styles.itemText, isActive && styles.itemTextActive]}>{item.text}</Text>

          {!disabled && (
            <View style={styles.dragHandle} onTouchStart={drag}>
              <Ionicons name="menu" size={24} color="#94a3b8" />
            </View>
          )}
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.hint}>
        <Ionicons name={disabled ? 'lock-closed' : 'move'} size={16} color={disabled ? '#10b981' : '#3b82f6'} />
        <Text style={styles.hintText}>
          {disabled ? 'Đã xác nhận thứ tự' : 'Kéo và thả để sắp xếp theo thứ tự đúng'}
        </Text>
      </View>

      <GestureHandlerRootView style={styles.listContainer}>
        <DraggableFlatList
          data={data}
          onDragEnd={handleDragEnd}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          containerStyle={styles.flatList}
          activationDistance={disabled ? 999999 : 0}
        />
      </GestureHandlerRootView>
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
  listContainer: {
    minHeight: 200,
  },
  flatList: {
    gap: 12,
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
    marginBottom: 12,
  },
  orderItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  orderItemDisabled: {
    opacity: 0.7,
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
  itemTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dragHandle: {
    padding: 8,
    marginRight: -8,
  },
});
