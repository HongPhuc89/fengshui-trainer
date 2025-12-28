import React from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AvatarSectionProps {
  avatarUrl?: string | null;
  fullName: string;
  onPress: () => void;
}

export const AvatarSection: React.FC<AvatarSectionProps> = ({ avatarUrl, fullName, onPress }) => {
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} testID="avatar-container" activeOpacity={0.8}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} testID="avatar-image" />
      ) : (
        <View style={styles.initialsContainer}>
          <Text style={styles.initials}>{getInitials(fullName)}</Text>
        </View>
      )}

      <View style={styles.cameraOverlay}>
        <Ionicons name="camera" size={20} color="#fff" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'relative',
    alignSelf: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  initialsContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1E1E2E',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E1E2E',
  },
});
