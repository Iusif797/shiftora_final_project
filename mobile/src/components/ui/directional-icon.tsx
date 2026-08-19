import type { ComponentType } from 'react';
import { View } from 'react-native';
import { useI18n } from '@/i18n/I18nProvider';
import { mirrorIcon } from '@/i18n/rtl-styles';

interface IconProps {
  color: string;
  size: number;
  strokeWidth: number;
}

/**
 * Wraps an icon so it flips when the layout is mirrored.
 *
 * Yoga mirrors LAYOUT, not artwork: a right-pointing arrow keeps pointing
 * right in Hebrew, where it now means "backwards". Only icons that carry a
 * direction should go through this — a checkmark or an envelope must not flip.
 *
 * Call it at module level so the component identity is stable across renders.
 */
export function directionalIcon(Icon: ComponentType<IconProps>) {
  function DirectionalIcon(props: IconProps) {
    const { isRTL } = useI18n();
    return (
      <View style={mirrorIcon(isRTL)}>
        <Icon {...props} />
      </View>
    );
  }
  DirectionalIcon.displayName = `Directional(${Icon.displayName ?? Icon.name ?? 'Icon'})`;
  return DirectionalIcon;
}
