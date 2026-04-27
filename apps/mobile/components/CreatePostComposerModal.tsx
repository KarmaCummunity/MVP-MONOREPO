import React, { useMemo, useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../globals/colors';
import { db } from '../utils/databaseService';
import { useUser } from '../stores/userStore';
import { usePostComposerStore, PostIntent } from '../stores/postComposerStore';

const CATEGORIES = ['items', 'money', 'trump', 'knowledge', 'time', 'challenges'] as const;

export default function CreatePostComposerModal(): React.ReactElement {
  const { t } = useTranslation(['common', 'donations']);
  const { selectedUser } = useUser();
  const { visible, initialCategory, initialIntent, closeComposer } = usePostComposerStore();

  const [intent, setIntent] = useState<PostIntent>('give');
  const [category, setCategory] = useState<string>('items');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!visible) return;
    setIntent(initialIntent);
    setCategory(initialCategory);
    setTitle('');
    setDescription('');
    setCity('');
    setQuantity('1');
    setAmount('');
  }, [visible, initialCategory, initialIntent]);

  const showAmountField = category === 'money';
  const showQuantityField = category === 'items';

  /** Title is required; guest/login errors stay in submit() when title is present */
  const canPublish = title.trim().length > 0;

  const submit = async () => {
    if (!selectedUser?.id) {
      Alert.alert(t('common:error'), t('common:guestLoginHint'));
      return;
    }
    if (!title.trim()) {
      Alert.alert(t('common:error'), t('common:postComposer.titleRequired'));
      return;
    }

    try {
      await db.createDedicatedItem({
        owner_id: selectedUser.id,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        city: city.trim() || undefined,
        quantity: showQuantityField ? Math.max(1, Number(quantity) || 1) : 1,
        price: showAmountField ? Math.max(0, Number(amount) || 0) : 0,
        condition: 'used',
        status: 'available',
        intent,
      });

      Alert.alert(
        t('common:confirm'),
        intent === 'request' ? t('common:postComposer.requestPublished') : t('common:postComposer.givePublished'),
      );
      closeComposer();
    } catch (e) {
      Alert.alert(t('common:error'), t('common:genericTryAgain'));
    }
  };

  const titleText = useMemo(
    () => (intent === 'request' ? t('common:postComposer.requestTitle') : t('common:postComposer.giveTitle')),
    [intent, t],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={closeComposer}>
      <View style={[styles.backdrop, Platform.OS === 'web' && styles.backdropWeb]}>
        <TouchableOpacity style={styles.backdropTouch} onPress={closeComposer} accessibilityRole="button" />
        <View style={[styles.sheet, Platform.OS === 'web' && styles.sheetWeb]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{titleText}</Text>
            <TouchableOpacity onPress={closeComposer}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.toggleRow}>
            <TouchableOpacity style={[styles.toggleBtn, intent === 'give' && styles.toggleBtnActive]} onPress={() => setIntent('give')}>
              <Text style={styles.toggleText}>{t('common:give')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, intent === 'request' && styles.requestBtnActive]} onPress={() => setIntent('request')}>
              <Text style={styles.toggleText}>{t('common:request')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.categoriesRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity key={c} style={[styles.categoryChip, category === c && styles.categoryChipActive]} onPress={() => setCategory(c)}>
                <Text style={styles.categoryText}>{t(`donations:categories.${c}.title`, { defaultValue: c })}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput style={styles.input} placeholder={t('common:postComposer.title')} value={title} onChangeText={setTitle} />
          <TextInput style={[styles.input, styles.multiline]} placeholder={t('common:postComposer.description')} value={description} onChangeText={setDescription} multiline />
          <TextInput style={styles.input} placeholder={t('common:postComposer.city')} value={city} onChangeText={setCity} />
          {showQuantityField ? (
            <TextInput style={styles.input} placeholder={t('common:postComposer.quantity')} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
          ) : null}
          {showAmountField ? (
            <TextInput style={styles.input} placeholder={t('common:postComposer.amount')} value={amount} onChangeText={setAmount} keyboardType="number-pad" />
          ) : null}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              intent === 'request' && styles.submitRequest,
              !canPublish && styles.submitBtnDisabled,
            ]}
            onPress={submit}
            disabled={!canPublish}
            accessibilityState={{ disabled: !canPublish }}
          >
            <Text style={styles.submitText}>{t('common:postComposer.publish')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  // Full-viewport layer on web so the sheet stays above app chrome and wide-layout scrollers (F12 vs normal width)
  backdropWeb: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 2147483000,
  } as const,
  backdropTouch: { flex: 1 },
  sheet: { height: '85%', backgroundColor: colors.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 },
  sheetWeb: { zIndex: 2147483001 },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 12, backgroundColor: colors.border, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontWeight: '700', color: colors.textPrimary, fontSize: 18 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  toggleBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: colors.successLight, borderColor: colors.success },
  requestBtnActive: { backgroundColor: colors.warningLight, borderColor: colors.warning },
  toggleText: { fontWeight: '600', color: colors.textPrimary },
  categoriesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  categoryChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  categoryChipActive: { backgroundColor: colors.infoLight, borderColor: colors.primary },
  categoryText: { color: colors.textPrimary, fontSize: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, color: colors.textPrimary },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  submitBtn: { marginTop: 'auto', backgroundColor: colors.success, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  submitRequest: { backgroundColor: colors.warning },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { color: colors.white, fontWeight: '700' },
});
