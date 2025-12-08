/**
 * Example Component: Books List Screen
 *
 * This is a complete example showing how to use the API hooks
 * in a real React Native screen component.
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Image,
} from 'react-native';
import { useBooks } from '../hooks';
import type { Book } from '../api';

interface BooksListScreenProps {
  navigation: any; // Replace with proper navigation type
}

export function BooksListScreen({ navigation }: BooksListScreenProps) {
  const { books, isLoading, error, refetch } = useBooks();

  // Loading state - show spinner on initial load
  if (isLoading && books.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading books...</Text>
      </View>
    );
  }

  // Error state - show error message with retry button
  if (error && books.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load books</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state - no books available
  if (books.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No books available</Text>
      </View>
    );
  }

  // Render individual book item
  const renderBookItem = ({ item }: { item: Book }) => (
    <TouchableOpacity style={styles.bookCard} onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}>
      {item.coverImage ? (
        <Image source={{ uri: item.coverImage }} style={styles.bookCover} resizeMode="cover" />
      ) : (
        <View style={[styles.bookCover, styles.placeholderCover]}>
          <Text style={styles.placeholderText}>📚</Text>
        </View>
      )}

      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {item.author && (
          <Text style={styles.bookAuthor} numberOfLines={1}>
            by {item.author}
          </Text>
        )}

        {item.description && (
          <Text style={styles.bookDescription} numberOfLines={3}>
            {item.description}
          </Text>
        )}

        <View style={styles.bookFooter}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.published ? 'Published' : 'Draft'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Main render - list of books with pull-to-refresh
  return (
    <View style={styles.container}>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBookItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#007AFF" />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    padding: 16,
  },

  // Loading states
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },

  // Error states
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Empty state
  emptyText: {
    fontSize: 16,
    color: '#666',
  },

  // Book card
  bookCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookCover: {
    width: '100%',
    height: 200,
    backgroundColor: '#E0E0E0',
  },
  placeholderCover: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
  },
  bookInfo: {
    padding: 16,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  bookDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  bookFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },

  // List separator
  separator: {
    height: 16,
  },
});
