import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, ViewStyle } from 'react-native';

interface GradientBackgroundProps {
  children: React.ReactNode;
  variant?: 'redGold' | 'blue' | 'purple';
  style?: ViewStyle;
}

const gradientColors = {
  redGold: ['#8B0000', '#B8860B', '#DAA520'],
  blue: ['#1a1a2e', '#16213e', '#0f3460'],
  purple: ['#2d1b69', '#5b2a86', '#8e44ad'],
};

export function GradientBackground({ children, variant = 'blue', style }: GradientBackgroundProps) {
  return (
    <LinearGradient colors={gradientColors[variant]} style={[styles.container, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
