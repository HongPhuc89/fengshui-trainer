import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSizes } from '@/constants';
import { Book } from '@/modules/shared/services/api/types';
import { imageCacheService } from '../../services/offline-cache/image-cache.service';

interface BookHeaderCardProps {
  book: Book;
}

export function BookHeaderCard({ book }: BookHeaderCardProps) {
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      if (book.coverImage) {
        try {
          const cachedPath = await imageCacheService.getImage(book.coverImage);
          setImageSource(cachedPath);
        } catch (error) {
          console.error('[BookHeaderCard] Failed to load image:', error);
          setImageSource(book.coverImage); // Fallback to original URL
        }
      }
      setImageLoading(false);
    };

    loadImage();
  }, [book.coverImage]);

  return (
    <View style={styles.bookHeaderCard}>
      {/* Book Cover */}
      <View style={styles.coverContainer}>
        {imageSource && !imageLoading ? (
          <Image source={{ uri: imageSource }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderCover}>
            <Ionicons name="book" size={40} color="#6B7280" />
          </View>
        )}
      </View>

      {/* Book Info */}
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle}>{book.title}</Text>
        {book.author && <Text style={styles.bookAuthor}>{book.author}</Text>}

        {/* Tags */}
        <View style={styles.tagsContainer}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>Tự Tiến</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>Phong Thủy</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bookHeaderCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  coverContainer: {
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: spacing.xs,
  },
  bookAuthor: {
    fontSize: fontSizes.sm,
    color: '#F59E0B',
    marginBottom: spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(107, 114, 128, 0.3)',
    borderRadius: 6,
  },
  tagText: {
    fontSize: fontSizes.xs,
    color: '#D1D5DB',
    fontWeight: '500',
  },
});
