/**
 * API Test Screen
 * Screen để test các API services và hooks
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useAuth, useBooks } from '../modules/shared/services/hooks';

export default function ApiTestScreen() {
  const { user, isAuthenticated, login, logout, isLoading: authLoading } = useAuth();
  const { books, isLoading: booksLoading, error: booksError, refetch } = useBooks();

  const [testEmail] = useState('test@example.com');
  const [testPassword] = useState('password123');

  const handleLogin = async () => {
    try {
      await login(testEmail, testPassword);
      Alert.alert('Success', 'Logged in successfully!');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Please check your credentials');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      Alert.alert('Success', 'Logged out successfully!');
    } catch (error: any) {
      Alert.alert('Logout Failed', error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 Authentication Test</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}</Text>

          {user && (
            <>
              <Text style={styles.label}>User:</Text>
              <Text style={styles.value}>{user.email}</Text>
              <Text style={styles.value}>ID: {user.id}</Text>
            </>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleLogin}
              disabled={authLoading || isAuthenticated}
            >
              {authLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>{isAuthenticated ? 'Already Logged In' : 'Login'}</Text>
              )}
            </TouchableOpacity>

            {isAuthenticated && (
              <TouchableOpacity
                style={[styles.button, styles.dangerButton]}
                onPress={handleLogout}
                disabled={authLoading}
              >
                <Text style={styles.buttonText}>Logout</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.hint}>
            Test credentials: {testEmail} / {testPassword}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 Books API Test</Text>

        <View style={styles.card}>
          {booksLoading && books.length === 0 ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading books...</Text>
            </View>
          ) : booksError ? (
            <View style={styles.centerContent}>
              <Text style={styles.errorText}>❌ Error loading books</Text>
              <Text style={styles.errorMessage}>{booksError.message}</Text>
              <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={refetch}>
                <Text style={styles.buttonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : books.length === 0 ? (
            <Text style={styles.emptyText}>No books found</Text>
          ) : (
            <>
              <Text style={styles.label}>Total Books: {books.length}</Text>

              {books.slice(0, 3).map((book) => (
                <View key={book.id} style={styles.bookItem}>
                  <Text style={styles.bookTitle}>{book.title}</Text>
                  {book.author && <Text style={styles.bookAuthor}>by {book.author}</Text>}
                  <Text style={styles.bookStatus}>{book.published ? '✅ Published' : '📝 Draft'}</Text>
                </View>
              ))}

              {books.length > 3 && <Text style={styles.moreText}>... and {books.length - 3} more books</Text>}

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={refetch}
                disabled={booksLoading}
              >
                {booksLoading ? <ActivityIndicator color="#007AFF" /> : <Text style={styles.buttonText}>Refresh</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ API Info</Text>

        <View style={styles.card}>
          <Text style={styles.label}>API URL:</Text>
          <Text style={styles.value}>{process.env.EXPO_PUBLIC_API_URL || 'Not configured'}</Text>

          <Text style={styles.label}>Environment:</Text>
          <Text style={styles.value}>{process.env.EXPO_PUBLIC_ENV || 'development'}</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>💡 Make sure your backend is running at the configured URL</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📖 Documentation</Text>

        <View style={styles.card}>
          <Text style={styles.docText}>• API Services: modules/shared/services/api/</Text>
          <Text style={styles.docText}>• React Hooks: modules/shared/services/hooks/</Text>
          <Text style={styles.docText}>• Examples: modules/shared/services/examples/</Text>
          <Text style={styles.docText}>• Guide: HUONG_DAN_SU_DUNG.md</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: '#000',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 12,
    fontStyle: 'italic',
  },
  centerContent: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  bookItem: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    marginTop: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  bookStatus: {
    fontSize: 12,
    color: '#4CAF50',
  },
  moreText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
  },
  docText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
});
