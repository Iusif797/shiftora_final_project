import { authClient } from './auth-client';
import type { AppUser } from '@/types/app';

export async function resolvePostAuthPath() {
  const result = await authClient.getSession();
  const user = result.data?.user as AppUser | undefined;

  if (!user) {
    return null;
  }

  return user.restaurantId ? '/(app)/(tabs)' : '/onboarding';
}
