import { View } from 'react-native';
import { LanguageSwitcher } from '@/components/language-switcher';
import { UserMenu } from '@/components/user-menu';
import { useSession } from '@/lib/auth/use-session';
import { spacing } from '@/theme';
import type { AppUser } from '@/types/app';

/**
 * The standard trailing header cluster: language icon + account icon.
 * `ScreenHeader` mounts this by default, so every screen gets both controls
 * without 15 call sites having to remember. Pass `rightSlot={null}` to a
 * screen that must not show them, or a node of your own to replace them.
 */
export function HeaderActions({ showUser = true }: { showUser?: boolean }) {
  const { data: session } = useSession();
  const user = session?.user as AppUser | undefined;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <LanguageSwitcher />
      {showUser && user ? <UserMenu name={user.name} /> : null}
    </View>
  );
}
