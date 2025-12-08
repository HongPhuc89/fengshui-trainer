import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { colors, fontSizes, spacing } from '@/constants';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();

  const handleLogout = () => {
    // TODO: Clear auth data
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👤 Tài khoản</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <Text style={styles.name}>Người dùng</Text>
          <Text style={styles.email}>user@example.com</Text>
        </View>

        <View style={styles.actions}>
          <Button variant="outline" fullWidth onPress={handleLogout}>
            Đăng xuất
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray[200],
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: 'bold',
    color: colors.neutral.gray[900],
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  profile: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary.red,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 48,
  },
  name: {
    fontSize: fontSizes.xl,
    fontWeight: '600',
    color: colors.neutral.gray[900],
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: fontSizes.base,
    color: colors.neutral.gray[600],
  },
  actions: {
    marginTop: spacing.xl,
  },
});
