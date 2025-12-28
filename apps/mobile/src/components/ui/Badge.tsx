import React from 'react';
import { View, Text, ViewProps, ViewStyle, TextStyle } from 'react-native';
import { colors } from '@/constants';

export interface BadgeProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', size = 'md', style, ...props }) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      case 'info':
        return colors.info;
      case 'primary':
        return colors.primary.red;
      case 'secondary':
        return colors.secondary.gold;
      default:
        return colors.primary.red;
    }
  };

  const badgeStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    paddingHorizontal: size === 'sm' ? 8 : size === 'md' ? 12 : 16,
    paddingVertical: size === 'sm' ? 2 : size === 'md' ? 4 : 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  };

  const textStyle: TextStyle = {
    color: colors.neutral.white,
    fontSize: size === 'sm' ? 10 : size === 'md' ? 12 : 14,
    fontWeight: '600',
  };

  return (
    <View style={[badgeStyle, style]} {...props}>
      <Text style={textStyle}>{children}</Text>
    </View>
  );
};
