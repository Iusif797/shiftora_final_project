import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Camera, Edit2, Check, Settings } from 'lucide-react-native';
import { AppBackground, ScreenHeader } from '@/components/app-shell';
import { PrimaryButton, SecondaryButton, AccentBadge } from '@/components/buttons';
import { SurfaceCard } from '@/components/cards';
import { FormField } from '@/components/form-field';
import { api } from '@/lib/api/api';
import { useSession, useInvalidateSession } from '@/lib/auth/use-session';
import { pickImage } from '@/lib/file-picker';
import { uploadFile } from '@/lib/upload';
import { getInitials } from '@/lib/formatters';
import { colors, radius, roleAppearance, spacing, typography } from '@/theme';
import type { AppUser } from '@/types/app';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { data: session } = useSession();
  const invalidateSession = useInvalidateSession();
  const user = session?.user as AppUser | undefined;
  const role = roleAppearance[user?.role ?? 'employee'];

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [isUploading, setIsUploading] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name?: string; image?: string }) => api.patch('/api/users/me', data),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditing(false);
      invalidateSession();
    },
  });

  const handleUploadPhoto = async () => {
    try {
      const file = await pickImage();
      if (!file) return;

      setIsUploading(true);
      const result = await uploadFile(file.uri, file.filename, file.mimeType);
      
      await updateProfileMutation.mutateAsync({ image: result.url });
    } catch (err) {
      console.error(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    updateProfileMutation.mutate({ name });
  };

  return (
    <AppBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScreenHeader title="Profile" />
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: spacing.md, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <View style={{ position: 'relative' }}>
              {user?.image ? (
                <Image
                  source={{ uri: user.image }}
                  style={{ width: 100, height: 100, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.default }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: radius.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: `${role.color}18`,
                    borderWidth: 1,
                    borderColor: `${role.color}38`,
                  }}
                >
                  <Text style={{ ...typography.display, color: role.color }}>{getInitials(user?.name ?? '?')}</Text>
                </View>
              )}
              
              <Pressable
                onPress={handleUploadPhoto}
                disabled={isUploading}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 36,
                  height: 36,
                  borderRadius: radius.full,
                  backgroundColor: colors.bg.surface,
                  borderWidth: 1,
                  borderColor: colors.border.strong,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color={colors.text.primary} />
                ) : (
                  <Camera color={colors.text.primary} size={16} strokeWidth={2} />
                )}
              </Pressable>
            </View>
            <View style={{ marginTop: spacing.md }}>
              <AccentBadge label={user?.role ?? 'employee'} color={role.color} tint={`${role.color}18`} />
            </View>
          </View>

          <SurfaceCard>
            {isEditing ? (
              <View style={{ gap: spacing.lg }}>
                <FormField
                  label="Full Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  focused={true}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  autoCapitalize="words"
                />
                <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <SecondaryButton label="Cancel" onPress={() => setIsEditing(false)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label="Save"
                      icon={Check}
                      onPress={handleSave}
                      loading={updateProfileMutation.isPending}
                      disabled={!name.trim() || name === user?.name}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ gap: spacing.lg }}>
                <View>
                  <Text style={{ ...typography.label, color: colors.text.tertiary, marginBottom: 4 }}>Full Name</Text>
                  <Text style={{ ...typography.h3, color: colors.text.primary }}>{user?.name}</Text>
                </View>
                <View>
                  <Text style={{ ...typography.label, color: colors.text.tertiary, marginBottom: 4 }}>Email Address</Text>
                  <Text style={{ ...typography.body, color: colors.text.secondary }}>{user?.email}</Text>
                </View>
                
                <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                  <SecondaryButton label="Edit Profile" icon={Edit2} onPress={() => setIsEditing(true)} />
                  <SecondaryButton label="Restaurant settings" icon={Settings} onPress={() => router.push('/(app)/settings')} />
                </View>
              </View>
            )}
          </SurfaceCard>
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}
