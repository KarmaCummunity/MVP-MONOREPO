import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import type { RefObject } from 'react';
import type { ItemsScreenTranslate } from './itemsScreenFiltering';
import { Ionicons as Icon } from '@expo/vector-icons';
import colors from '../../globals/colors';
import ScrollContainer from '../../components/ScrollContainer';
import AddLinkComponent from '../../components/AddLinkComponent';
import PostReelItem from '../../components/Feed/PostReelItem';
import type { FeedItem } from '../../types/feed';
import { ITEM_CATEGORY_DEFS } from './itemCategoryDefs';
import type { ItemType } from './itemsScreen.types';
import { itemsScreenStyles } from './itemsScreen.styles';

type Styles = typeof itemsScreenStyles;

export type ItemsScreenOfferModeProps = Readonly<{
  styles: Styles;
  t: ItemsScreenTranslate;
  titleInputRef: RefObject<TextInput | null>;
  title: string;
  onTitleChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  selectedCategory: ItemType;
  onSelectCategory: (id: ItemType) => void;
  showCategoryDropdown: boolean;
  onShowCategoryDropdown: (v: boolean) => void;
  city: string;
  onCityChange: (v: string) => void;
  address: string;
  onAddressChange: (v: string) => void;
  qty: number;
  onDecQty: () => void;
  onIncQty: () => void;
  condition: 'new' | 'like_new' | 'used' | 'for_parts' | '';
  onConditionChange: (k: 'new' | 'like_new' | 'used' | 'for_parts') => void;
  imageUri: string;
  onPickImage: () => void;
  onRemoveImage: () => void;
  onPublish: () => void;
  canPublish: boolean;
  openRequestsExpanded: boolean;
  onToggleOpenRequests: () => void;
  openRequestPosts: FeedItem[];
  recentPosts: FeedItem[];
  onMorePress: (item: FeedItem, position?: { x: number; y: number }) => void;
  onPostClosed: (postId: string) => void;
  onPostPress?: (item: FeedItem) => void;
}>;

export function ItemsScreenOfferMode({
  styles: s,
  t,
  titleInputRef,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  selectedCategory,
  onSelectCategory,
  showCategoryDropdown,
  onShowCategoryDropdown,
  city,
  onCityChange,
  address,
  onAddressChange,
  qty,
  onDecQty,
  onIncQty,
  condition,
  onConditionChange,
  imageUri,
  onPickImage,
  onRemoveImage,
  onPublish,
  canPublish,
  openRequestsExpanded,
  onToggleOpenRequests,
  openRequestPosts,
  recentPosts,
  onMorePress,
  onPostClosed,
  onPostPress,
}: ItemsScreenOfferModeProps) {
  const { width } = Dimensions.get('window');

  const conditionOpts: { key: 'new' | 'like_new' | 'used' | 'for_parts'; labelKey: string }[] = [
    { key: 'new', labelKey: 'donationScreen.offer.conditionNew' },
    { key: 'like_new', labelKey: 'donationScreen.offer.conditionLikeNew' },
    { key: 'used', labelKey: 'donationScreen.offer.conditionUsed' },
    { key: 'for_parts', labelKey: 'donationScreen.offer.conditionForParts' },
  ];

  return (
    <ScrollContainer
      style={s.container}
      contentStyle={s.scrollContent}
      keyboardShouldPersistTaps="always"
      showsVerticalScrollIndicator={false}
    >
      <View style={s.formContainer}>
        <TouchableOpacity style={s.section} onPress={onToggleOpenRequests}>
          <Text style={s.sectionTitle}>{t('donationScreen.offer.openRequestsList')}</Text>
          <Text style={s.emptyStateText}>{openRequestsExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {openRequestsExpanded && (
          <View style={s.section}>
            {openRequestPosts.length === 0 ? (
              <Text style={s.emptyStateText}>{t('donationScreen.offer.noOpenRequests')}</Text>
            ) : (
              openRequestPosts.map((post) => (
                <View key={post.id} style={s.recentItemWrapper}>
                  <PostReelItem
                    item={post}
                    cardWidth={width - 64}
                    numColumns={1}
                    onPress={onPostPress}
                    onMorePress={onMorePress}
                    onPostClosed={onPostClosed}
                  />
                </View>
              ))
            )}
          </View>
        )}
        <View style={s.row}>
          <View style={s.field}>
            <Text style={s.label}>{t('donationScreen.offer.titleLabel')}</Text>
            <TextInput
              ref={titleInputRef}
              style={s.input}
              value={title}
              onChangeText={onTitleChange}
              placeholder={t('donationScreen.offer.titlePlaceholder')}
            />
          </View>
        </View>

        <View style={s.row}>
          <View style={s.field}>
            <Text style={s.label}>{t('donationScreen.offer.descriptionLabel')}</Text>
            <TextInput
              style={[s.input, { height: 80 }]}
              value={description}
              onChangeText={onDescriptionChange}
              placeholder={t('donationScreen.offer.descriptionPlaceholder')}
              multiline
            />
          </View>
        </View>

        <View style={s.row}>
          <View style={s.field}>
            <Text style={s.label}>{t('donationScreen.offer.categoryLabel')}</Text>
            <TouchableOpacity
              style={s.dropdownButton}
              onPress={() => onShowCategoryDropdown(true)}
              activeOpacity={0.7}
            >
              <Text style={[s.dropdownButtonText, !selectedCategory && s.dropdownPlaceholder]}>
                {ITEM_CATEGORY_DEFS.some((c) => c.id === selectedCategory)
                  ? t(ITEM_CATEGORY_DEFS.find((c) => c.id === selectedCategory)!.labelKey)
                  : t('donationScreen.offer.selectCategory')}
              </Text>
              <Icon name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <Modal visible={showCategoryDropdown} transparent animationType="fade" onRequestClose={() => onShowCategoryDropdown(false)}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => onShowCategoryDropdown(false)}>
            <View style={s.modalContent} onStartShouldSetResponder={() => true}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{t('donationScreen.offer.categoryModalTitle')}</Text>
                <TouchableOpacity onPress={() => onShowCategoryDropdown(false)} style={s.modalCloseButton}>
                  <Icon name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={[...ITEM_CATEGORY_DEFS]}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[s.dropdownItem, selectedCategory === item.id && s.dropdownItemSelected]}
                    onPress={() => {
                      onSelectCategory(item.id);
                      onShowCategoryDropdown(false);
                    }}
                  >
                    <Icon
                      name={item.icon as never}
                      size={20}
                      color={selectedCategory === item.id ? colors.primary : colors.textSecondary}
                      style={s.dropdownItemIcon}
                    />
                    <Text
                      style={[s.dropdownItemText, selectedCategory === item.id && s.dropdownItemTextSelected]}
                    >
                      {t(item.labelKey)}
                    </Text>
                    {selectedCategory === item.id && <Icon name="checkmark" size={20} color={colors.success} />}
                  </TouchableOpacity>
                )}
                style={s.dropdownList}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        <View style={s.row}>
          <View style={s.fieldSmall}>
            <Text style={s.label}>{t('donationScreen.offer.cityLabel')}</Text>
            <TextInput
              style={s.input}
              value={city}
              onChangeText={onCityChange}
              placeholder={t('donationScreen.offer.cityPlaceholder')}
            />
          </View>
          <View style={s.fieldSmall}>
            <Text style={s.label}>{t('donationScreen.offer.addressLabel')}</Text>
            <TextInput
              style={s.input}
              value={address}
              onChangeText={onAddressChange}
              placeholder={t('donationScreen.offer.addressPlaceholder')}
            />
          </View>
        </View>

        <View style={s.row}>
          <View style={s.fieldSmall}>
            <Text style={s.label}>{t('donationScreen.offer.qtyLabel')}</Text>
            <View style={s.counterRow}>
              <TouchableOpacity style={s.counterBtn} onPress={onDecQty}>
                <Text style={s.counterText}>-</Text>
              </TouchableOpacity>
              <Text style={s.counterValue}>{qty}</Text>
              <TouchableOpacity style={s.counterBtn} onPress={onIncQty}>
                <Text style={s.counterText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={s.labelInline}>{t('donationScreen.offer.conditionLabel')}</Text>
        <View style={s.row}>
          <View style={s.field}>
            <View style={s.tagsRow}>
              {conditionOpts.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[s.tag, s.tagSmall, condition === opt.key && s.tagSelected]}
                  onPress={() => onConditionChange(opt.key)}
                >
                  <Text style={[s.tagText, s.tagTextSm, condition === opt.key && s.tagTextSelected]}>
                    {t(opt.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={s.imageSection}>
          <Text style={s.labelInline}>{t('donationScreen.offer.imageOptional')}</Text>
          <TouchableOpacity style={s.imagePickerButton} onPress={onPickImage}>
            <Icon name="image-outline" size={24} color={colors.primary} />
            <Text style={s.imagePickerText}>
              {imageUri ? `✅ ${t('donationScreen.offer.imageSelected')}` : t('donationScreen.offer.imagePick')}
            </Text>
          </TouchableOpacity>

          {imageUri ? (
            <View style={s.imagePreview}>
              <Image source={{ uri: imageUri }} style={s.previewImage} />
              <View style={s.imageInfo}>
                <Text style={s.imageInfoText}>✅ {t('donationScreen.offer.imageReady')}</Text>
                <Text style={s.imageInfoSubtext}>{t('donationScreen.offer.imageSizeHint')}</Text>
              </View>
              <TouchableOpacity style={s.removeImageButton} onPress={onRemoveImage}>
                <Icon name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={[s.offerButton, !title && { opacity: 0.5 }]} onPress={onPublish} disabled={!canPublish}>
          <Text style={s.offerButtonText}>{t('donationScreen.offer.publishButton')}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>{t('donationScreen.offer.recentSectionTitle')}</Text>
        {recentPosts.length === 0 ? (
          <Text style={s.emptyStateText}>{t('donationScreen.offer.noRecentPosts')}</Text>
        ) : (
          <View style={s.recentContainer}>
            {recentPosts.map((post) => {
              const totalPadding = 16 + 16 + 8;
              const recentCardWidth = width - totalPadding * 2;
              return (
                <View key={post.id} style={s.recentItemWrapper}>
                  <PostReelItem
                    item={post}
                    cardWidth={recentCardWidth}
                    numColumns={1}
                    onPress={onPostPress}
                    onCommentPress={(feedItem) => {
                      console.log('Comment pressed:', feedItem.id);
                    }}
                    onMorePress={onMorePress}
                    onPostClosed={onPostClosed}
                  />
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>{t('donationScreen.offer.usefulLinks')}</Text>
        <AddLinkComponent category="items" />
      </View>
    </ScrollContainer>
  );
}
