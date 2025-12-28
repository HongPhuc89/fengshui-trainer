/**
 * Simple API Test Screen
 * Test API connection without custom UI components
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { apiClient } from '../modules/shared/services/api/client';
import { booksService } from '../modules/shared/services/api/books.service';

export default function SimpleApiTestScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    // Get API URL
    const url = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    setApiUrl(url);

    // Auto fetch books on mount
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 Fetching books from API...');

      const data = await booksService.getAllBooks();

      console.log('✅ Books fetched successfully:', data);
      setBooks(data);

      Alert.alert('Success', `Fetched ${data.length} books from backend!`);
    } catch (err: any) {
      console.error('❌ Error fetching books:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
      setError(errorMessage);
      Alert.alert('Error', `Failed to fetch books: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDirectApiCall = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 Testing direct API call...');

      const response = await apiClient.get('/books');

      console.log('✅ Direct API call successful:', response);
      Alert.alert('Success', `Direct API call returned ${JSON.stringify(response).length} bytes`);
    } catch (err: any) {
      console.error('❌ Direct API call failed:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
      Alert.alert('Error', `Direct API call failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testHealthCheck = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Testing health check...');

      // Try to hit the root API endpoint
      const response = await fetch(`${apiUrl}/api`);
      const text = await response.text();

      console.log('✅ Health check response:', text);
      Alert.alert('Health Check', `Status: ${response.status}\n\n${text.substring(0, 200)}`);
    } catch (err: any) {
      console.error('❌ Health check failed:', err);
      Alert.alert('Error', `Health check failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📡 API Test Screen</Text>
          <Text style={styles.subtitle}>Testing backend connection</Text>
        </View>

        {/* API Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Configuration</Text>
          <View style={styles.card}>
            <Text style={styles.label}>API URL:</Text>
            <Text style={styles.value}>{apiUrl}/api</Text>

            <Text style={styles.label}>Environment:</Text>
            <Text style={styles.value}>{process.env.EXPO_PUBLIC_ENV || 'development'}</Text>
          </View>
        </View>

        {/* Test Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 API Tests</Text>

          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={fetchBooks} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>📚 Fetch Books (Service)</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={testDirectApiCall}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>🔗 Direct API Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={testHealthCheck}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>❤️ Health Check</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Results</Text>

          <View style={styles.card}>
            {isLoading && (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}

            {error && !isLoading && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>❌ Error</Text>
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
            )}

            {!isLoading && !error && books.length === 0 && (
              <Text style={styles.emptyText}>No books found. Click "Fetch Books" to test API.</Text>
            )}

            {!isLoading && books.length > 0 && (
              <View>
                <Text style={styles.successText}>✅ Successfully fetched {books.length} books!</Text>

                {books.slice(0, 3).map((book, index) => (
                  <View key={book.id || index} style={styles.bookItem}>
                    <Text style={styles.bookTitle}>{book.title || 'Untitled'}</Text>
                    {book.author && <Text style={styles.bookAuthor}>by {book.author}</Text>}
                    <Text style={styles.bookId}>ID: {book.id}</Text>
                  </View>
                ))}

                {books.length > 3 && <Text style={styles.moreText}>... and {books.length - 3} more books</Text>}
              </View>
            )}
          </View>
        </View>

        {/* Console Logs Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Tips</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              • Check console logs for detailed API responses{'\n'}• Make sure backend is running at {apiUrl}
              {'\n'}• All API calls are logged with 🔄 ✅ ❌ emojis{'\n'}• Press Ctrl+C in terminal to see logs
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
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
    marginTop: 8,
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: '#000',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 50,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
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
  errorContainer: {
    padding: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D32F2F',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#C62828',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 16,
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
  bookId: {
    fontSize: 12,
    color: '#999',
  },
  moreText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 22,
  },
});
