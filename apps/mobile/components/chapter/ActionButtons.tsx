import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '@/constants';

const { height } = Dimensions.get('window');

type ActionButton = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradient: string[];
};

const ACTION_BUTTONS: ActionButton[] = [
  {
    id: 'flashcard',
    label: 'Thẻ Nhớ',
    icon: 'book',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#6D28D9'],
  },
  {
    id: 'mindmap',
    label: 'Sơ Đồ',
    icon: 'git-network',
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
  },
  {
    id: 'quiz',
    label: 'Thử Thách',
    icon: 'flash',
    color: '#EF4444',
    gradient: ['#EF4444', '#DC2626'],
  },
];

interface ActionButtonsProps {
  onActionPress: (actionId: string) => void;
}

export function ActionButtons({ onActionPress }: ActionButtonsProps) {
  return (
    <View style={styles.actionButtonsContainer}>
      <LinearGradient
        colors={['rgba(107, 114, 128, 0.95)', 'rgba(75, 85, 99, 0.98)']}
        style={styles.actionButtonsGradient}
      >
        <SafeAreaView edges={['bottom']}>
          <View style={styles.actionButtonsContent}>
            <Text style={styles.actionButtonsTitle}>CHỌN HÌNH THỨC TU LUYỆN</Text>
            <View style={styles.actionButtons}>
              {ACTION_BUTTONS.map((button) => (
                <TouchableOpacity
                  key={button.id}
                  style={styles.actionButton}
                  onPress={() => onActionPress(button.id)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={button.gradient as [string, string, ...string[]]}
                    style={styles.actionButtonGradient}
                  >
                    <Ionicons name={button.icon} size={32} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.actionButtonLabel}>{button.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  actionButtonsGradient: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  actionButtonsContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  actionButtonsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D1D5DB',
    textAlign: 'center',
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionButtonGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  actionButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
});
