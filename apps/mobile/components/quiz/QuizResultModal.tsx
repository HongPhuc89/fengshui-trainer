import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface QuizResultModalProps {
  visible: boolean;
  passed: boolean;
  score: number;
  totalPoints: number;
  percentage: number;
  passingScore: number;
  correctCount: number;
  incorrectCount: number;
  totalQuestions: number;
  onViewDetails: () => void;
  onRetry: () => void;
  onClose: () => void;
}

export const QuizResultModal: React.FC<QuizResultModalProps> = ({
  visible,
  passed,
  score,
  totalPoints,
  percentage,
  passingScore,
  correctCount,
  incorrectCount,
  totalQuestions,
  onViewDetails,
  onRetry,
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      console.log('🎭 QuizResultModal: visible changed to true');
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      slideAnim.setValue(50);

      // Start animations
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      console.log('🎭 QuizResultModal: visible is false');
    }
  }, [visible]);

  if (!visible) {
    console.log('🎭 QuizResultModal: Not rendering (visible=false)');
    return null;
  }

  console.log('🎭 QuizResultModal: Rendering with props:', {
    passed,
    score,
    totalPoints,
    percentage,
    passingScore,
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={passed ? ['#10b981', '#059669', '#047857'] : ['#ef4444', '#dc2626', '#b91c1c']}
            style={styles.card}
          >
            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Icon */}
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.iconCircle}>
                <Ionicons name={passed ? 'trophy' : 'sad-outline'} size={80} color={passed ? '#fbbf24' : '#fff'} />
              </View>
            </Animated.View>

            {/* Title */}
            <Text style={styles.title}>{passed ? 'XUẤT SẮC!' : 'CHƯA ĐẠT'}</Text>
            <Text style={styles.subtitle}>
              {passed ? 'Bạn đã vượt qua bài kiểm tra!' : 'Đừng nản lòng, hãy thử lại nhé!'}
            </Text>

            {/* Score Display */}
            <View style={styles.scoreContainer}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scorePercentage}>{percentage.toFixed(0)}%</Text>
                <Text style={styles.scoreLabel}>Điểm đạt</Text>
              </View>
            </View>

            {/* Score Details */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Điểm số:</Text>
                <Text style={styles.detailValue}>
                  {score} / {totalPoints}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Điểm chuẩn:</Text>
                <Text style={styles.detailValue}>{passingScore}%</Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.statValue}>{correctCount}</Text>
                  <Text style={styles.statLabel}>Đúng</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                  <Text style={styles.statValue}>{incorrectCount}</Text>
                  <Text style={styles.statLabel}>Sai</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="help-circle" size={20} color="#6b7280" />
                  <Text style={styles.statValue}>{totalQuestions}</Text>
                  <Text style={styles.statLabel}>Tổng</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.primaryButton} onPress={onViewDetails}>
                <Ionicons name="list" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Xem chi tiết</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={onRetry}>
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={styles.secondaryButtonText}>Làm lại</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: width * 0.9,
    maxWidth: 400,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 24,
  },
  scoreContainer: {
    marginBottom: 24,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  scorePercentage: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
