import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { ArrowRight, Building2, Check, ChefHat, Ticket, Users } from 'lucide-react-native';
import { AuthBackground, GlassPanel } from '@/components/app-shell';
import { AccentBadge, PrimaryButton, SecondaryButton } from '@/components/buttons';
import { FormField } from '@/components/form-field';
import { api } from '@/lib/api/api';
import { useInvalidateSession } from '@/lib/auth/use-session';
import { colors, radius, roleAppearance, spacing, typography } from '@/theme';
import type { UserRole } from '@/types/app';

type Step = 'path' | 'owner-setup' | 'employee-code' | 'employee-role';
type UserPath = 'owner' | 'employee';

export default function Onboarding() {
  const [step, setStep] = useState<Step>('path');
  const [userPath, setUserPath] = useState<UserPath | null>(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [, setSelectedRole] = useState<UserRole>('employee');
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [verifiedInvite, setVerifiedInvite] = useState<{ role: UserRole; restaurant: { id: string; name: string } } | null>(null);
  const invalidateSession = useInvalidateSession();

  const stepIndex = useMemo(() => {
    if (step === 'path') return 0;
    if (step === 'owner-setup' || step === 'employee-code') return 1;
    return 2;
  }, [step]);

  const createRestaurantMutation = useMutation({
    mutationFn: async () => {
      if (!restaurantName.trim()) throw new Error('Enter your restaurant name');
      return api.post('/api/restaurants', { name: restaurantName.trim() });
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await invalidateSession();
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Failed to create restaurant'),
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async () => {
      if (!inviteCode.trim()) throw new Error('Enter the invitation code');
      return api.get<{ code: string; role: UserRole; restaurant: { id: string; name: string } }>(
        `/api/invitations/verify/${inviteCode.trim().toUpperCase()}`
      );
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setVerifiedInvite(data);
      setSelectedRole(data.role);
      setStep('employee-role');
      setError(null);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Invalid or expired code'),
  });

  const acceptInviteMutation = useMutation({
    mutationFn: () => api.post(`/api/invitations/accept/${inviteCode.trim().toUpperCase()}`),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await invalidateSession();
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Failed to join restaurant'),
  });

  const handlePathSelect = (path: UserPath) => {
    setUserPath(path);
    setStep(path === 'owner' ? 'owner-setup' : 'employee-code');
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const totalSteps = userPath === 'employee' ? 3 : 2;

  return (
    <AuthBackground>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.xxl, paddingTop: 72, paddingBottom: spacing.xxxxl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxxl }}>
          {Array.from({ length: totalSteps }).map((_, index) => {
            const active = stepIndex === index;
            const complete = stepIndex > index;
            return (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: radius.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: complete || active ? colors.brand.primary : 'transparent',
                    borderWidth: 1,
                    borderColor: complete || active ? colors.brand.primaryLight : colors.border.default,
                  }}
                >
                  {complete ? (
                    <Check color="#FFFFFF" size={14} strokeWidth={2.4} />
                  ) : active ? (
                    <Text style={{ ...typography.caption, color: '#FFFFFF' }}>{index + 1}</Text>
                  ) : (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: radius.full,
                        backgroundColor: colors.border.default,
                      }}
                    />
                  )}
                </View>
                {index < totalSteps - 1 ? (
                  <View style={{ width: 34, height: 1, backgroundColor: complete ? colors.brand.primary : colors.border.default }} />
                ) : null}
              </View>
            );
          })}
        </View>

        {step === 'path' ? (
          <View>
            <AccentBadge label="Get started" color={colors.brand.gold} tint={colors.warning.muted} />
            <Text style={{ ...typography.h1, color: colors.text.primary, marginTop: spacing.xl }}>How will you use Shiftora?</Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.md, marginBottom: spacing.xxxl }}>
              We'll set up the right workspace for your role.
            </Text>

            <View style={{ gap: spacing.md }}>
              <Pressable onPress={() => handlePathSelect('owner')} testID="path-owner">
                {({ pressed }) => (
                  <GlassPanel>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, opacity: pressed ? 0.9 : 1 }}>
                      <View style={{ width: 54, height: 54, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: `${roleAppearance.owner.color}18`, borderWidth: 1, borderColor: `${roleAppearance.owner.color}38` }}>
                        <Building2 color={roleAppearance.owner.color} size={24} strokeWidth={1.8} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...typography.h3, color: colors.text.primary }}>I own a restaurant</Text>
                        <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 }}>Create your workspace and invite your team</Text>
                      </View>
                      <ArrowRight color={roleAppearance.owner.color} size={18} strokeWidth={2.2} />
                    </View>
                  </GlassPanel>
                )}
              </Pressable>

              <Pressable onPress={() => handlePathSelect('employee')} testID="path-employee">
                {({ pressed }) => (
                  <GlassPanel>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, opacity: pressed ? 0.9 : 1 }}>
                      <View style={{ width: 54, height: 54, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: `${roleAppearance.employee.color}18`, borderWidth: 1, borderColor: `${roleAppearance.employee.color}38` }}>
                        <Users color={roleAppearance.employee.color} size={24} strokeWidth={1.8} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...typography.h3, color: colors.text.primary }}>I'm joining a team</Text>
                        <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 }}>Use an invite code from your manager</Text>
                      </View>
                      <ArrowRight color={roleAppearance.employee.color} size={18} strokeWidth={2.2} />
                    </View>
                  </GlassPanel>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}

        {step === 'owner-setup' ? (
          <View>
            <SecondaryButton label="Back" onPress={() => { setStep('path'); setError(null); }} testID="back-button" />
            <View style={{ marginTop: spacing.xl }}>
              <AccentBadge label="Restaurant Owner" color={roleAppearance.owner.color} tint={`${roleAppearance.owner.color}18`} />
            </View>
            <Text style={{ ...typography.h1, color: colors.text.primary, marginTop: spacing.xl }}>Create your restaurant</Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.md, marginBottom: spacing.xxxl }}>
              Set up your workspace and start managing your team.
            </Text>

            <GlassPanel>
              <FormField
                label="Restaurant name"
                value={restaurantName}
                onChangeText={setRestaurantName}
                placeholder="The Grand Kitchen"
                focused={focusedField === 'name'}
                hasError={error != null}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="words"
                testID="restaurant-input"
              />
              {error ? (
                <View style={{ marginTop: spacing.md, borderRadius: radius.lg, backgroundColor: colors.danger.muted, borderWidth: 1, borderColor: colors.danger.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
                  <Text style={{ ...typography.bodySmall, color: colors.danger.base }}>{error}</Text>
                </View>
              ) : null}
              <View style={{ marginTop: spacing.xl }}>
                <PrimaryButton
                  label="Create restaurant"
                  onPress={() => { setError(null); createRestaurantMutation.mutate(); }}
                  loading={createRestaurantMutation.isPending}
                  icon={ArrowRight}
                  testID="submit-button"
                />
              </View>
            </GlassPanel>
          </View>
        ) : null}

        {step === 'employee-code' ? (
          <View>
            <SecondaryButton label="Back" onPress={() => { setStep('path'); setError(null); }} testID="back-button" />
            <View style={{ marginTop: spacing.xl }}>
              <AccentBadge label="Join team" color={roleAppearance.employee.color} tint={`${roleAppearance.employee.color}18`} />
            </View>
            <Text style={{ ...typography.h1, color: colors.text.primary, marginTop: spacing.xl }}>Enter invite code</Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.md, marginBottom: spacing.xxxl }}>
              Your restaurant owner or manager shared a code with you.
            </Text>

            <GlassPanel>
              <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
                <View style={{ width: 64, height: 64, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warning.muted, borderWidth: 1, borderColor: colors.warning.border }}>
                  <Ticket color={colors.brand.gold} size={28} strokeWidth={1.8} />
                </View>
              </View>
              <FormField
                label="Invitation code"
                value={inviteCode}
                onChangeText={(v) => setInviteCode(v.toUpperCase())}
                placeholder="ABCD1234"
                focused={focusedField === 'code'}
                hasError={error != null}
                onFocus={() => setFocusedField('code')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="characters"
                testID="invite-code-input"
              />
              {error ? (
                <View style={{ marginTop: spacing.md, borderRadius: radius.lg, backgroundColor: colors.danger.muted, borderWidth: 1, borderColor: colors.danger.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
                  <Text style={{ ...typography.bodySmall, color: colors.danger.base }}>{error}</Text>
                </View>
              ) : null}
              <View style={{ marginTop: spacing.xl }}>
                <PrimaryButton
                  label="Verify code"
                  onPress={() => { setError(null); verifyCodeMutation.mutate(); }}
                  loading={verifyCodeMutation.isPending}
                  disabled={!inviteCode.trim()}
                  icon={ArrowRight}
                  testID="verify-code-button"
                />
              </View>
            </GlassPanel>
          </View>
        ) : null}

        {step === 'employee-role' && verifiedInvite ? (
          <View>
            <SecondaryButton label="Back" onPress={() => { setStep('employee-code'); setError(null); }} testID="back-button" />
            <View style={{ marginTop: spacing.xl }}>
              <AccentBadge label="Confirm" color={colors.success.base} tint={colors.success.muted} />
            </View>
            <Text style={{ ...typography.h1, color: colors.text.primary, marginTop: spacing.xl }}>Join {verifiedInvite.restaurant.name}</Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.md, marginBottom: spacing.xxxl }}>
              You've been invited as {verifiedInvite.role === 'manager' ? 'a shift manager' : 'a team member'}.
            </Text>

            <GlassPanel>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl }}>
                <View style={{ width: 54, height: 54, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: `${roleAppearance[verifiedInvite.role].color}18`, borderWidth: 1, borderColor: `${roleAppearance[verifiedInvite.role].color}38` }}>
                  {verifiedInvite.role === 'manager' ? (
                    <ChefHat color={roleAppearance.manager.color} size={24} strokeWidth={1.8} />
                  ) : (
                    <Users color={roleAppearance.employee.color} size={24} strokeWidth={1.8} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.h3, color: colors.text.primary }}>{verifiedInvite.restaurant.name}</Text>
                  <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 }}>
                    Role: {verifiedInvite.role === 'manager' ? 'Shift Manager' : 'Team Member'}
                  </Text>
                </View>
              </View>
              {error ? (
                <View style={{ marginBottom: spacing.md, borderRadius: radius.lg, backgroundColor: colors.danger.muted, borderWidth: 1, borderColor: colors.danger.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
                  <Text style={{ ...typography.bodySmall, color: colors.danger.base }}>{error}</Text>
                </View>
              ) : null}
              <PrimaryButton
                label="Join restaurant"
                onPress={() => { setError(null); acceptInviteMutation.mutate(); }}
                loading={acceptInviteMutation.isPending}
                icon={Check}
                testID="join-button"
              />
            </GlassPanel>
          </View>
        ) : null}
      </ScrollView>
    </AuthBackground>
  );
}
