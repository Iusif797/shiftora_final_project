import { useState } from 'react';
import { Image, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Camera, Plus, X } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { PrimaryButton } from '@/components/buttons';
import { SurfaceCard } from '@/components/cards';
import { StaggerItem } from '@/components/ui/motion';
import { ScalePressable } from '@/components/ui/pressable';
import { CardListSkeleton } from '@/components/ui/skeletons';
import { useT } from '@/i18n/I18nProvider';
import { api } from '@/lib/api/api';
import { pickImage } from '@/lib/file-picker';
import { showError, showSuccess } from '@/lib/toast';
import { uploadFile } from '@/lib/upload';
import { colors, radius, spacing, typography } from '@/theme';
import type { MenuCategory, MenuItem } from '@/types/pos';

export default function MenuManageScreen() {
  const t = useT();
  const queryClient = useQueryClient();
  const [categoryName, setCategoryName] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: categories, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['menu-categories-manage'],
    queryFn: () => api.get<MenuCategory[]>('/api/menu/categories'),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['menu-categories-manage'] });
    queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
  };

  const createCategory = useMutation({
    mutationFn: () => api.post<MenuCategory>('/api/menu/categories', { name: categoryName.trim() }),
    onSuccess: () => {
      setCategoryName('');
      showSuccess(t('ops.menu.categoryCreated'));
      invalidate();
    },
    onError: (err) => showError(t('ops.menu.actionFailed'), err.message),
  });

  const createItem = useMutation({
    mutationFn: async () => {
      if (!selectedCategoryId) throw new Error(t('ops.menu.selectCategoryError'));
      let photoUrl: string | null = null;
      if (photoUri) {
        setUploading(true);
        const file = await pickImage();
        const picked = file ?? { uri: photoUri, filename: `dish-${Date.now()}.jpg`, mimeType: 'image/jpeg' };
        const uploaded = await uploadFile(picked.uri, picked.filename, picked.mimeType);
        photoUrl = uploaded.url;
        setUploading(false);
      }
      return api.post<MenuItem>('/api/menu/items', {
        categoryId: selectedCategoryId,
        name: itemName.trim(),
        description: itemDescription.trim() || undefined,
        price: Number(itemPrice),
        photoUrl,
      });
    },
    onSuccess: () => {
      setItemName('');
      setItemPrice('');
      setItemDescription('');
      setPhotoUri(null);
      showSuccess(t('ops.menu.dishAdded'));
      invalidate();
    },
    onError: (err) => {
      setUploading(false);
      showError(t('ops.menu.actionFailed'), err.message);
    },
  });

  const pickPhoto = async () => {
    const file = await pickImage();
    if (file) setPhotoUri(file.uri);
  };

  return (
    <ScreenScroll
      title={t('ops.menu.title')}
      subtitle={t('ops.menu.subtitle')}
      leftSlot={<ScalePressable onPress={() => router.back()} testID="menu-manage-back" scale={0.9}><X color={colors.text.secondary} size={22} /></ScalePressable>}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.brand.gold} />}
      testID="menu-manage-screen"
    >
      <SurfaceCard>
        <Text style={{ ...typography.h4, color: colors.text.primary, marginBottom: spacing.md }}>{t('ops.menu.newCategoryTitle')}</Text>
        <TextInput value={categoryName} onChangeText={setCategoryName} placeholder={t('ops.menu.categoryPlaceholder')} placeholderTextColor={colors.text.disabled} style={{ minHeight: 48, borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.lg, paddingHorizontal: spacing.md, color: colors.text.primary, marginBottom: spacing.md }} testID="category-name-input" />
        <PrimaryButton label={t('ops.menu.addCategory')} icon={Plus} onPress={() => createCategory.mutate()} loading={createCategory.isPending} disabled={!categoryName.trim()} testID="add-category-button" />
      </SurfaceCard>

      <SurfaceCard>
        <Text style={{ ...typography.h4, color: colors.text.primary, marginBottom: spacing.md }}>{t('ops.menu.newDishTitle')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {categories?.map((category) => {
              const selected = selectedCategoryId === category.id;
              return (
                <ScalePressable key={category.id} onPress={() => setSelectedCategoryId(category.id)} scale={0.98} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: selected ? colors.brand.primaryLight : colors.border.default, backgroundColor: selected ? 'rgba(130,102,255,0.15)' : colors.bg.surface }}>
                  <Text style={{ ...typography.caption, color: selected ? colors.text.primary : colors.text.secondary }}>{category.name}</Text>
                </ScalePressable>
              );
            })}
          </View>
        </ScrollView>
        <TextInput value={itemName} onChangeText={setItemName} placeholder={t('ops.menu.dishNamePlaceholder')} placeholderTextColor={colors.text.disabled} style={{ minHeight: 48, borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.lg, paddingHorizontal: spacing.md, color: colors.text.primary, marginBottom: spacing.sm }} testID="item-name-input" />
        <TextInput value={itemPrice} onChangeText={setItemPrice} placeholder={t('ops.menu.pricePlaceholder')} keyboardType="decimal-pad" placeholderTextColor={colors.text.disabled} style={{ minHeight: 48, borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.lg, paddingHorizontal: spacing.md, color: colors.text.primary, marginBottom: spacing.sm }} testID="item-price-input" />
        <TextInput value={itemDescription} onChangeText={setItemDescription} placeholder={t('ops.menu.descriptionPlaceholder')} placeholderTextColor={colors.text.disabled} style={{ minHeight: 48, borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.lg, paddingHorizontal: spacing.md, color: colors.text.primary, marginBottom: spacing.md }} testID="item-description-input" />
        <ScalePressable onPress={pickPhoto} scale={0.98} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }} testID="pick-dish-photo">
          <Camera color={colors.brand.primary} size={18} />
          <Text style={{ ...typography.body, color: colors.text.secondary }}>{photoUri ? t('ops.menu.changePhoto') : t('ops.menu.addPhoto')}</Text>
        </ScalePressable>
        {photoUri ? <Image source={{ uri: photoUri }} style={{ width: 96, height: 96, borderRadius: radius.md, marginBottom: spacing.md }} /> : null}
        <PrimaryButton label={t('ops.menu.addDish')} icon={Plus} onPress={() => createItem.mutate()} loading={createItem.isPending || uploading} disabled={!itemName.trim() || !itemPrice || !selectedCategoryId} testID="add-dish-button" />
      </SurfaceCard>

      {isLoading ? (
        <View testID="menu-manage-loading">
          <CardListSkeleton count={3} />
        </View>
      ) : null}

      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        {categories?.map((category, index) => (
          <StaggerItem key={category.id} index={index}>
            <SurfaceCard>
              <Text style={{ ...typography.h3, color: colors.text.primary, marginBottom: spacing.sm }}>{category.name}</Text>
              {(category.items ?? []).map((item) => (
                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border.subtle }}>
                  {item.photoUrl ? <Image source={{ uri: item.photoUrl }} style={{ width: 44, height: 44, borderRadius: radius.sm }} /> : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.body, color: colors.text.primary }}>{item.name}</Text>
                    <Text style={{ ...typography.caption, color: colors.brand.gold }}>${item.price.toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            </SurfaceCard>
          </StaggerItem>
        ))}
      </View>
    </ScreenScroll>
  );
}
