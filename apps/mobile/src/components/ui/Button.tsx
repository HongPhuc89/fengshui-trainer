import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants';

export interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  gradient?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  gradient = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  onPress,
  style,
  ...props
}) => {
  const handlePress = (event: any) => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress?.(event);
    }
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      paddingHorizontal: size === 'sm' ? 16 : size === 'md' ? 24 : 32,
      paddingVertical: size === 'sm' ? 8 : size === 'md' ? 12 : 16,
      width: fullWidth ? '100%' : undefined,
    };

    if (variant === 'primary' && !gradient) {
      return { ...baseStyle, backgroundColor: colors.primary.red };
    }
    if (variant === 'secondary') {
      return { ...baseStyle, backgroundColor: colors.secondary.gold };
    }
    if (variant === 'outline') {
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.primary.red,
      };
    }
    if (variant === 'ghost') {
      return { ...baseStyle, backgroundColor: 'transparent' };
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: size === 'sm' ? 14 : size === 'md' ? 16 : 18,
      fontWeight: '600',
      marginHorizontal: 8,
    };

    if (variant === 'outline' || variant === 'ghost') {
      return { ...baseStyle, color: colors.primary.red };
    }

    return { ...baseStyle, color: colors.neutral.white };
  };

  const buttonStyle = getButtonStyle();
  const textStyle = getTextStyle();

  const content = (
    <>
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.primary.red : colors.neutral.white}
        />
      ) : (
        <>
          {leftIcon}
          <Text style={textStyle}>{children}</Text>
          {rightIcon}
        </>
      )}
    </>
  );

  if (gradient && variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[{ borderRadius: 12, width: fullWidth ? '100%' : undefined }, style]}
        {...props}
      >
        <LinearGradient
          colors={colors.gradients.redGold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[buttonStyle, { opacity: disabled ? 0.5 : 1 }]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[buttonStyle, { opacity: disabled ? 0.5 : 1 }, style]}
      {...props}
    >
      {content}
    </TouchableOpacity>
  );
};
