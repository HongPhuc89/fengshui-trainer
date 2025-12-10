import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Debug helper to check AsyncStorage token
 */
export async function debugToken() {
  const token = await AsyncStorage.getItem('token');
  const user = await AsyncStorage.getItem('user');

  console.log('=== TOKEN DEBUG ===');
  console.log('Token exists:', !!token);
  if (token) {
    console.log('Token preview:', token.substring(0, 50) + '...');
    console.log('Token length:', token.length);
  }
  console.log('User:', user);
  console.log('==================');

  return { token, user };
}

/**
 * Manually set token for testing
 */
export async function setTestToken(token: string) {
  await AsyncStorage.setItem('token', token);
  console.log('✅ Test token set');
}

/**
 * Clear all auth data
 */
export async function clearAuth() {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
  console.log('✅ Auth data cleared');
}
