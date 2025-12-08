import React from 'react';
import { ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants';

export interface GradientBackgroundProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'lucky' | 'gold' | 'redGold' | 'jade';
  colors?: string[];
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

  return (
    <LinearGradient
      colors={getGradientColors()}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ flex: 1 }, style]}
      {...props}
    >
      {children}
    </LinearGradient>
  );
};
