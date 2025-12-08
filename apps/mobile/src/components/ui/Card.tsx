import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows } from '@/constants';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  gradientColors?: string[];
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  shadow = 'md',
  gradientColors,
  style,
  ...props
}) => {
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 16,
      backgroundColor: colors.neutral.white,
    };

    // Padding
    const paddingValue = padding === 'none' ? 0 : padding === 'sm' ? 12 : padding === 'md' ? 16 : 24;

    const paddingStyle: ViewStyle = {
      padding: paddingValue,
    };

    // Shadow
    const shadowStyle = shadow !== 'none' ? shadows[shadow] : {};

    // Variant
    if (variant === 'outlined') {
      return {
        ...baseStyle,
        ...paddingStyle,
        borderWidth: 1,
        borderColor: colors.neutral.gray[200],
      };
    }

    if (variant === 'elevated') {
      return {
        ...baseStyle,
        ...paddingStyle,
        ...shadowStyle,
      };
    }

    return {
      ...baseStyle,
      ...paddingStyle,
      ...(variant === 'default' ? shadowStyle : {}),
    };
  };

  const cardStyle = getCardStyle();

  if (variant === 'gradient' && gradientColors) {
    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[cardStyle, style]}
        {...props}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={[cardStyle, style]} {...props}>
      {children}
    </View>
  );
};
