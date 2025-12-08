import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Button, Input, Card } from '@/components/ui';
import { colors, fontSizes, spacing } from '@/constants';
import { useAuth } from '@/modules/shared/services/contexts/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    // Validate input
    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email không hợp lệ');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting login with:', email);

      // Call AuthContext login (which handles token storage automatically)
      await login(email.trim(), password);

      console.log('✅ Login successful');

      // AuthProvider will handle navigation automatically
      // Show success message (non-blocking)
      setTimeout(() => {
        Alert.alert('Đăng nhập thành công!', 'Chào mừng bạn quay trở lại!');
      }, 500);
    } catch (err: any) {
      console.error('❌ Login failed:', err);

      // Handle different error types
      let errorMessage = 'Đăng nhập thất bại';

      if (err.response) {
        // Server responded with error
        const status = err.response.status;
        const data = err.response.data;

        if (status === 401) {
          errorMessage = 'Email hoặc mật khẩu không đúng';
        } else if (status === 404) {
          errorMessage = 'Tài khoản không tồn tại';
        } else if (data?.message) {
          errorMessage = data.message;
        }
      } else if (err.request) {
        // Request made but no response
        errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
      } else {
        // Other errors
        errorMessage = err.message || 'Đã xảy ra lỗi không xác định';
      }

      setError(errorMessage);
      Alert.alert('Lỗi đăng nhập', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    // Navigation handled by expo-router
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

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

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
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginTop: spacing.md,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: fontSizes.sm,
    fontWeight: '600',
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
