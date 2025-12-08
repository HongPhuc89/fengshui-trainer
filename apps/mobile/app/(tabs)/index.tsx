import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Card } from '@/components/ui';
import { colors, fontSizes, spacing } from '@/constants';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GradientBackground variant="redGold" style={styles.header}>
        <Text style={styles.greeting}>Xin chào! 👋</Text>
        <Text style={styles.subtitle}>Sẵn sàng học tập hôm nay?</Text>
      </GradientBackground>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Sách nổi bật</Text>
          <Card padding="lg">
            <Text>Coming soon...</Text>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📂 Danh mục</Text>
          <Card padding="lg">
            <Text>Coming soon...</Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.gray[50],
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  greeting: {
    fontSize: fontSizes['3xl'],
    fontWeight: 'bold',
    color: colors.neutral.white,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.neutral.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '600',
    color: colors.neutral.gray[900],
    marginBottom: spacing.md,
  },
});
