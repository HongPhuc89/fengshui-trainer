import React from 'react';
import { View, ViewProps, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants';

export interface GradientBackgroundProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'lucky' | 'gold' | 'redGold' | 'jade';
  colors?: readonly [string, string, ...string[]];
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  variant = 'redGold',
  colors: customColors,
  style,
  ...props
}) => {
  const getGradientColors = () => {
    if (customColors) return customColors;

    switch (variant) {
      case 'lucky':
        return colors.gradients.lucky;
      case 'gold':
        return colors.gradients.gold;
      case 'redGold':
        return colors.gradients.redGold;
      case 'jade':
        return colors.gradients.jade;
      default:
        return colors.gradients.redGold;
    }
  };

  const gradientColors = getGradientColors();

  // For web, use CSS gradient as fallback
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          {
            flex: 1,
            // @ts-ignore - CSS gradient for web
            backgroundImage: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
          },
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    );
  }

  // For native, use LinearGradient
  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ flex: 1 }, style]}
      {...props}
    >
      {children}
    </LinearGradient>
  );
};
