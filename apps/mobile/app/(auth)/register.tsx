import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Button, Input, Card } from '@/components/ui';
import { colors, fontSizes, spacing } from '@/constants';
import { authService } from '@/modules/shared/services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    // Validate inputs
    if (!name || !email || !password || !confirmPassword) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email không hợp lệ');
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    // Check password match
    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('📝 Attempting registration for:', email);

      // Call real backend API
      const response = await authService.register({
        email: email.trim(),
        password: password,
        name: name.trim(),
      });

      console.log('✅ Registration successful:', response);

      // Show success message
      Alert.alert('Đăng ký thành công!', 'Tài khoản của bạn đã được tạo. Vui lòng đăng nhập.', [
        {
          text: 'Đăng nhập ngay',
          onPress: () => {
            router.replace('/(auth)/login');
          },
        },
      ]);
    } catch (err: any) {
      console.error('❌ Registration failed:', err);

      // Handle different error types
      let errorMessage = 'Đăng ký thất bại';

      if (err.response) {
        // Server responded with error
        const status = err.response.status;
        const data = err.response.data;

        if (status === 409 || status === 400) {
          errorMessage = 'Email đã được sử dụng';
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
      Alert.alert('Lỗi đăng ký', errorMessage);
    } finally {
      setLoading(false);
    }
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

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              ) : null}

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
