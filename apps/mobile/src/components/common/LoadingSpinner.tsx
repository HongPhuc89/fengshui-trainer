import React from 'react';
import { View, ActivityIndicator, Text, ViewStyle, TextStyle } from 'react-native';
import { colors } from '@/constants';

export interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = colors.primary.red,
  text,
  fullScreen = false,
}) => {
  const containerStyle: ViewStyle = {
    justifyContent: 'center',
    alignItems: 'center',
    ...(fullScreen && {
      flex: 1,
      backgroundColor: colors.neutral.white,
    }),
  };

  const textStyle: TextStyle = {
    marginTop: 16,
    fontSize: 16,
    color: colors.neutral.gray[600],
  };

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={textStyle}>{text}</Text>}
    </View>
  );
};
