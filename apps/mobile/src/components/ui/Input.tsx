import React, { useState } from 'react';
import { View, TextInput, Text, TextInputProps, ViewStyle, TextStyle, TouchableOpacity } from 'react-native';
import { colors, spacing } from '@/constants';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  helperText,
  containerStyle,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const containerStyles: ViewStyle = {
    marginBottom: spacing.md,
  };

  const labelStyle: TextStyle = {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.gray[700],
    marginBottom: spacing.xs,
  };

  const inputContainerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: error ? colors.error : isFocused ? colors.primary.red : colors.neutral.gray[300],
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.neutral.white,
  };

  const inputStyle: TextStyle = {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.neutral.gray[900],
  };

  const helperTextStyle: TextStyle = {
    fontSize: 12,
    color: error ? colors.error : colors.neutral.gray[500],
    marginTop: spacing.xs,
  };

  return (
    <View style={[containerStyles, containerStyle]}>
      {label && <Text style={labelStyle}>{label}</Text>}

      <View style={inputContainerStyle}>
        {leftIcon && <View style={{ marginRight: spacing.sm }}>{leftIcon}</View>}

        <TextInput
          style={[inputStyle, style]}
          placeholderTextColor={colors.neutral.gray[400]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {rightIcon && <View style={{ marginLeft: spacing.sm }}>{rightIcon}</View>}
      </View>

      {(error || helperText) && <Text style={helperTextStyle}>{error || helperText}</Text>}
    </View>
  );
};
