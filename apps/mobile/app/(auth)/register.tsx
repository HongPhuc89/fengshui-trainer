import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Button, Input, Card } from '@/components/ui';
import { colors, fontSizes, spacing } from '@/constants';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      alert('Mật khẩu không khớp!');
      return;
    }

    setLoading(true);
    // TODO: Implement register logic
    setTimeout(() => {
      setLoading(false);
      router.replace('/(tabs)');
    }, 1500);
  };

  const handleBackToLogin = () => {
    router.back();
  };

  return (
    <GradientBackground variant="redGold">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>🎋 Đăng ký</Text>
              <Text style={styles.subtitle}>Tạo tài khoản mới để bắt đầu hành trình học tập</Text>
            </View>

            <Card style={styles.card} padding="lg">
              <Input label="Họ và tên" placeholder="Nguyễn Văn A" value={name} onChangeText={setName} />

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
                helperText="Tối thiểu 8 ký tự"
              />

              <Input
                label="Xác nhận mật khẩu"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

              <Button
                gradient
                fullWidth
                size="lg"
                loading={loading}
                onPress={handleRegister}
                style={styles.registerButton}
              >
                Đăng ký
              </Button>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Đã có tài khoản? </Text>
                <Button variant="ghost" size="sm" onPress={handleBackToLogin}>
                  Đăng nhập
                </Button>
              </View>
            </Card>
          </ScrollView>
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
  },
  header: {
    marginTop: spacing.xl,
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
  registerButton: {
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
