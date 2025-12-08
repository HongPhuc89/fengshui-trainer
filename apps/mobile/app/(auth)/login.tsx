import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Button, Input, Card } from '@/components/ui';
import { colors, fontSizes, spacing } from '@/constants';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    // TODO: Implement login logic
    setTimeout(() => {
      setLoading(false);
      router.replace('/(tabs)');
    }, 1500);
  };

  const handleRegister = () => {
    router.push('/(auth)/register');
  };

  return (
    <GradientBackground variant="redGold">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <View style={styles.header}>
            <Text style={styles.title}>🎋 Đăng nhập</Text>
            <Text style={styles.subtitle}>Chào mừng trở lại! Đăng nhập để tiếp tục học tập</Text>
          </View>

          <Card style={styles.card} padding="lg">
            <Input
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Mật khẩu"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button gradient fullWidth size="lg" loading={loading} onPress={handleLogin} style={styles.loginButton}>
              Đăng nhập
            </Button>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Chưa có tài khoản? </Text>
              <Button variant="ghost" size="sm" onPress={handleRegister}>
                Đăng ký ngay
              </Button>
            </View>
          </Card>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSizes['4xl'],
    fontWeight: 'bold',
    color: colors.neutral.white,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.neutral.white,
    opacity: 0.9,
  },
  card: {
    marginBottom: spacing.lg,
  },
  loginButton: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: fontSizes.sm,
    color: colors.neutral.gray[600],
  },
});
