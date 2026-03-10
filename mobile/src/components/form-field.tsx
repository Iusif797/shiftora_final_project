import { Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  focused: boolean;
  hasError?: boolean;
  onFocus: () => void;
  onBlur: () => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCorrect?: boolean;
  testID?: string;
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  focused,
  hasError = false,
  onFocus,
  onBlur,
  autoCapitalize = 'none',
  keyboardType = 'default',
  autoCorrect = false,
  testID,
}: FormFieldProps) {
  return (
    <View>
      <Text style={{ ...typography.label, color: colors.text.tertiary, marginBottom: spacing.sm }}>{label}</Text>
      <View
        style={{
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: hasError
            ? colors.danger.base
            : focused
              ? colors.brand.primaryLight
              : colors.border.default,
          backgroundColor: colors.bg.surface,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.text.disabled}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          autoCorrect={autoCorrect}
          testID={testID}
          style={{
            minHeight: 56,
            paddingHorizontal: spacing.lg,
            color: colors.text.primary,
            fontSize: 16,
          }}
        />
      </View>
    </View>
  );
}
