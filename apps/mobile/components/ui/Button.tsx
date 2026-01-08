import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  gradient?: boolean;
  style?: ViewStyle;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  gradient = false,
  style,
}: ButtonProps) {
  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [styles.text, styles[`text_${variant}`], styles[`text_${size}`]];

  const content = (
    <>
      {loading && <ActivityIndicator color="#fff" style={styles.loader} />}
      <Text style={textStyles as TextStyle}>{children}</Text>
    </>
  );

  if (gradient && variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.button,
          fullWidth && styles.fullWidth,
          disabled && styles.disabled,
          { padding: 0, overflow: 'hidden' },
          style,
        ]}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#DC143C', '#8B0000', '#B8860B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, styles[`button_${size}`], fullWidth && { width: '100%' }]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} style={buttonStyles} activeOpacity={0.8}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  button_primary: {
    backgroundColor: '#8B0000',
  },
  button_secondary: {
    backgroundColor: '#4A5568',
  },
  button_ghost: {
    backgroundColor: 'transparent',
  },
  button_sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  button_md: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  button_lg: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  gradient: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  text: {
    fontWeight: '600',
    color: '#fff',
  },
  text_primary: {
    color: '#fff',
  },
  text_secondary: {
    color: '#fff',
  },
  text_ghost: {
    color: '#8B0000',
  },
  text_sm: {
    fontSize: 14,
  },
  text_md: {
    fontSize: 16,
  },
  text_lg: {
    fontSize: 18,
  },
  loader: {
    marginRight: 8,
  },
});
