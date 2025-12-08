import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground, Button } from '@/components/ui';
import { colors, fontSizes } from '@/constants';

export default function IndexScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/(auth)/login');
  };

  return (
    <GradientBackground variant="redGold">
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>🎋 Quiz Game</Text>
          <Text style={styles.subtitle}>Học tập thông minh với phong cách phong thủy</Text>
        </View>

        <View style={styles.footer}>
          <Button gradient fullWidth size="lg" onPress={handleGetStarted}>
            Bắt đầu
          </Button>
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSizes['5xl'],
    fontWeight: 'bold',
    color: colors.neutral.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.lg,
    color: colors.neutral.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  footer: {
    paddingBottom: 32,
  },
});
