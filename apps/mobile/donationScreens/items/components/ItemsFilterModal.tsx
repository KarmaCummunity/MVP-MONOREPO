import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import colors from '../../../globals/colors';
import { ITEM_CATEGORY_DEFS } from '../itemCategoryDefs';
import { useTranslation } from 'react-i18next';
import { createShadowStyle } from '../../../globals/styles';

interface ItemsFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: {
    categories: string[];
    condition: string[];
    address: string;
    radius: number;
  }) => void;
  initialFilters: {
    categories: string[];
    condition: string[];
    address: string;
    radius: number;
  };
}

const CONDITIONS = [
  { id: 'new', labelKey: 'condition.new', he: 'חדש' },
  { id: 'like_new', labelKey: 'condition.like_new', he: 'כמו חדש' },
  { id: 'used', labelKey: 'condition.used', he: 'משומש' },
  { id: 'damaged', labelKey: 'condition.damaged', he: 'הרוס' },
];

const RADIUS_OPTIONS = [1, 2, 5, 10, 20, 50];

export default function ItemsFilterModal({ visible, onClose, onApply, initialFilters }: ItemsFilterModalProps) {
  const { t: ti } = useTranslation('items');
  const { t: tc } = useTranslation('common');

  const [selectedCats, setSelectedCats] = useState<string[]>(initialFilters.categories);
  const [selectedConds, setSelectedConds] = useState<string[]>(initialFilters.condition);
  const [address, setAddress] = useState(initialFilters.address);
  const [radius, setRadius] = useState(initialFilters.radius);

  useEffect(() => {
    if (visible) {
      setSelectedCats(initialFilters.categories);
      setSelectedConds(initialFilters.condition);
      setAddress(initialFilters.address);
      setRadius(initialFilters.radius);
    }
  }, [visible, initialFilters]);

  const toggleCat = (id: string) => {
    setSelectedCats(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleCond = (id: string) => {
    setSelectedConds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleApply = () => {
    onApply({
      categories: selectedCats,
      condition: selectedConds,
      address,
      radius,
    });
    onClose();
  };

  const handleClear = () => {
    setSelectedCats([]);
    setSelectedConds([]);
    setAddress('');
    setRadius(10);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>{ti('donationScreen.search.filterTitle', { defaultValue: 'סינון' })}</Text>
            <TouchableOpacity onPress={handleClear}>
              <Text style={styles.clearText}>{tc('clearAll', { defaultValue: 'נקה הכל' })}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Categories */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{ti('donationScreen.categories.title', { defaultValue: 'קטגוריות' })}</Text>
              <View style={styles.catGrid}>
                {ITEM_CATEGORY_DEFS.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catItem,
                      selectedCats.includes(cat.id) && styles.catItemActive
                    ]}
                    onPress={() => toggleCat(cat.id)}
                  >
                    <Icon name={cat.icon as any} size={20} color={selectedCats.includes(cat.id) ? colors.white : colors.textPrimary} />
                    <Text style={[styles.catLabel, selectedCats.includes(cat.id) && styles.catLabelActive]}>
                      {ti(cat.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Condition */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{ti('donationScreen.filters.condition', { defaultValue: 'מצב החפץ' })}</Text>
              <View style={styles.condRow}>
                {CONDITIONS.map(cond => (
                  <TouchableOpacity
                    key={cond.id}
                    style={[
                      styles.condItem,
                      selectedConds.includes(cond.id) && styles.condItemActive
                    ]}
                    onPress={() => toggleCond(cond.id)}
                  >
                    <Text style={[styles.condLabel, selectedConds.includes(cond.id) && styles.condLabelActive]}>
                      {ti(`donationScreen.filters.${cond.id}`, { defaultValue: cond.he })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Location & Radius */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{ti('donationScreen.filters.location', { defaultValue: 'מיקום ורדיוס' })}</Text>
              <TextInput
                style={styles.input}
                placeholder={ti('donationScreen.offer.addressPlaceholder', { defaultValue: 'הכנס כתובת...' })}
                value={address}
                onChangeText={setAddress}
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={styles.subTitle}>{ti('donationScreen.filters.radius', { defaultValue: 'רדיוס (ק"מ)' })}: {radius}</Text>
              <View style={styles.radiusRow}>
                {RADIUS_OPTIONS.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.radiusItem,
                      radius === r && styles.radiusItemActive
                    ]}
                    onPress={() => setRadius(r)}
                  >
                    <Text style={[styles.radiusLabel, radius === r && styles.radiusLabelActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>{tc('apply', { defaultValue: 'החל' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '85%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  clearText: {
    color: colors.secondary,
    fontSize: 14,
  },
  scroll: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'right',
  },
  catGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  catItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.pinkLight,
    gap: 6,
  },
  catItemActive: {
    backgroundColor: colors.secondary,
  },
  catLabel: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  catLabelActive: {
    color: colors.white,
    fontWeight: 'bold',
  },
  condRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  condItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.pinkLight,
  },
  condItemActive: {
    backgroundColor: colors.warning,
  },
  condLabel: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  condLabelActive: {
    color: colors.white,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: colors.pinkLight,
    borderRadius: 12,
    padding: 12,
    textAlign: 'right',
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'right',
  },
  radiusRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  radiusItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.pinkLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radiusItemActive: {
    backgroundColor: colors.secondary,
  },
  radiusLabel: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  radiusLabelActive: {
    color: colors.white,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  applyButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    ...createShadowStyle(colors.black, { width: 0, height: 2 }, 0.2, 4),
  },
  applyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
