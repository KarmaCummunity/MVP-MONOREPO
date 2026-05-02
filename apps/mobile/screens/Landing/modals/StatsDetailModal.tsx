import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import colors, { SCRIM_BLACK_40 } from '../../../globals/colors';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import { IS_MOBILE_WEB as isMobileWeb } from '../constants';
import { apiService } from '../../../utils/apiService';
import { USE_BACKEND } from '../../../utils/dbConfig';
import { logger } from '../../../utils/loggerService';

type StatType =
  | 'siteVisits'
  | 'totalUsers'
  | 'totalMoneyDonated'
  | 'itemDonations'
  | 'completedRides'
  | 'uniqueDonors'
  | 'recurringDonationsAmount'
  | 'completedTasks';

function statValueSuffix(statType: StatType, t: (k: string) => string): string {
  switch (statType) {
    case 'totalMoneyDonated':
    case 'recurringDonationsAmount':
      return t('statModal.suffixMoney');
    case 'completedRides':
      return t('statModal.suffixRides');
    case 'itemDonations':
      return t('statModal.suffixItems');
    case 'totalUsers':
    case 'uniqueDonors':
      return t('statModal.suffixPeople');
    case 'siteVisits':
      return t('statModal.suffixVisits');
    case 'completedTasks':
      return t('statModal.suffixTasks');
    default:
      return t('statModal.suffixGeneric');
  }
}

function formatStatHeadline(
  statType: StatType,
  value: number,
  locale: string | undefined,
  t: (k: string) => string,
): string {
  const loc = locale === 'he' ? 'he-IL' : locale ?? 'en-US';
  const suffix = statValueSuffix(statType, t);
  if (statType === 'totalMoneyDonated' || statType === 'recurringDonationsAmount') {
    return `${value.toLocaleString(loc)} ${suffix}`.trim();
  }
  return `${value.toLocaleString(loc)} ${suffix}`.trim();
}

export const StatsDetailModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  statType: string;
  statTitle: string;
  statValue: number;
  iconName: string;
  iconColor: string;
}> = ({ visible, onClose, statType, statTitle, statValue, iconName, iconColor }) => {
  const { t } = useTranslation('communityStats');
  const { t: tCommon } = useTranslation('common');
  const { i18n } = useTranslation();
  const locale = i18n.language;

  const [detailData, setDetailData] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const typedStat = statType as StatType;

  const headline = useMemo(
    () => formatStatHeadline(typedStat, statValue, locale, t),
    [typedStat, statValue, locale, t],
  );

  const loadDetailData = useCallback(async () => {
    try {
      setIsLoading(true);
      logger.info('StatsDetailModal', `Loading detail data for ${statType}`);
      const response = await apiService.getStatDetails(statType);
      if (response.success && response.data) {
        setDetailData(Array.isArray(response.data) ? response.data : []);
        logger.info('StatsDetailModal', `Loaded ${(response.data as unknown[]).length} items for ${statType}`);
      } else {
        setDetailData([]);
      }
    } catch (error) {
      logger.error('StatsDetailModal', 'Failed to load detail data', { error, statType });
      setDetailData([]);
    } finally {
      setIsLoading(false);
    }
  }, [statType]);

  useEffect(() => {
    if (visible && USE_BACKEND) {
      void loadDetailData();
    } else if (visible && !USE_BACKEND) {
      setDetailData([]);
    }
  }, [visible, loadDetailData]);

  const renderDetailItem = ({ item, index }: { item: Record<string, unknown>; index: number }) => {
    const dateLoc = locale === 'he' ? 'he-IL' : undefined;
    switch (statType) {
      case 'siteVisits':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {new Date(String(item.timestamp || item.created_at || 0)).toLocaleString(dateLoc)}
              </Text>
              {item.user_agent && typeof item.user_agent === 'string' && item.user_agent.length > 0 ? (
                <Text style={styles.detailItemSubtext} numberOfLines={2}>
                  {item.user_agent.length > 50 ? `${item.user_agent.substring(0, 50)}…` : item.user_agent}
                </Text>
              ) : null}
            </View>
          </View>
        );

      case 'totalUsers':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>{String(item.name || item.email || '—')}</Text>
              <Text style={styles.detailItemSubtext}>
                {new Date(String(item.join_date || item.created_at || 0)).toLocaleDateString(dateLoc)}
              </Text>
              {item.city ? <Text style={styles.detailItemSubtext}>{String(item.city)}</Text> : null}
            </View>
          </View>
        );

      case 'totalMoneyDonated':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {String(item.donor_name || '—')} • {Number(item.amount || 0).toLocaleString(dateLoc)} ₪
              </Text>
              <Text style={styles.detailItemSubtext}>
                {new Date(String(item.donation_date || item.created_at || 0)).toLocaleDateString(dateLoc)}
              </Text>
              {item.category_name ? (
                <Text style={styles.detailItemSubtext}>{String(item.category_name)}</Text>
              ) : null}
            </View>
          </View>
        );

      case 'itemDonations':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>{String(item.title || item.item_name || '—')}</Text>
              <Text style={styles.detailItemSubtext}>
                {new Date(String(item.created_at || 0)).toLocaleDateString(dateLoc)}
              </Text>
              {item.donor_name ? (
                <Text style={styles.detailItemSubtext}>{String(item.donor_name)}</Text>
              ) : null}
            </View>
          </View>
        );

      case 'completedRides':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {String(item.from_city || '—')} → {String(item.to_city || '—')}
              </Text>
              <Text style={styles.detailItemSubtext}>
                {new Date(String(item.ride_date || item.created_at || 0)).toLocaleDateString(dateLoc)}
              </Text>
              {item.driver_name ? (
                <Text style={styles.detailItemSubtext}>{String(item.driver_name)}</Text>
              ) : null}
            </View>
          </View>
        );

      case 'uniqueDonors':
      case 'recurringDonationsAmount':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {String(item.donor_name || '—')}
                {item.amount != null ? ` • ${Number(item.amount).toLocaleString(dateLoc)} ₪` : ''}
              </Text>
              {item.frequency ? <Text style={styles.detailItemSubtext}>{String(item.frequency)}</Text> : null}
              {item.start_date ? (
                <Text style={styles.detailItemSubtext}>
                  {new Date(String(item.start_date)).toLocaleDateString(dateLoc)}
                </Text>
              ) : null}
            </View>
          </View>
        );

      case 'completedTasks':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>{String(item.title || '—')}</Text>
              {item.category ? <Text style={styles.detailItemSubtext}>{String(item.category)}</Text> : null}
              {item.updated_at ? (
                <Text style={styles.detailItemSubtext}>
                  {new Date(String(item.updated_at)).toLocaleDateString(dateLoc)}
                </Text>
              ) : null}
            </View>
          </View>
        );

      default:
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>{JSON.stringify(item)}</Text>
            </View>
          </View>
        );
    }
  };

  const sheetAlign = Platform.OS === 'web' ? 'center' : 'flex-end';
  const sheetPaddingBottom = Platform.OS === 'ios' ? 28 : Platform.OS === 'android' ? 20 : 16;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <Pressable style={[modalStyles.overlay, { justifyContent: sheetAlign }]} onPress={onClose}>
        <View style={[modalStyles.sheet, { paddingBottom: sheetPaddingBottom }]}>
          <LinearGradient
            colors={[`${iconColor}22`, colors.white]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.2, y: 1 }}
            style={modalStyles.headerGradient}
          >
            <View style={modalStyles.dragHandle} />
            <View style={modalStyles.headerRow}>
              <TouchableOpacity onPress={onClose} style={modalStyles.closeCircle} accessibilityLabel={tCommon('close')}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={modalStyles.headerMain}>
                <View style={[modalStyles.iconBadge, { backgroundColor: `${iconColor}24` }]}>
                  <Ionicons name={iconName as any} size={isMobileWeb ? 26 : 30} color={iconColor} />
                </View>
                <View style={modalStyles.titleBlock}>
                  <Text style={modalStyles.modalTitle}>{statTitle}</Text>
                  <Text style={modalStyles.headlineValue}>{headline}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          <View style={modalStyles.body}>
            {isLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={iconColor} />
                <Text style={styles.modalLoadingText}>{t('statModal.loadingDetails')}</Text>
              </View>
            ) : detailData.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Ionicons name="layers-outline" size={isMobileWeb ? 44 : 56} color={colors.textSecondary} />
                <Text style={styles.modalEmptyText}>{t('statModal.noData')}</Text>
              </View>
            ) : (
              <FlatList
                data={detailData as Record<string, unknown>[]}
                renderItem={renderDetailItem}
                keyExtractor={(item, index) => `${statType}-${index}`}
                showsVerticalScrollIndicator
                contentContainerStyle={styles.detailList}
              />
            )}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: SCRIM_BLACK_40,
    paddingHorizontal: IS_MOBILE_WEB ? 12 : 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    maxHeight: '88%',
    backgroundColor: colors.white,
    borderRadius: IS_MOBILE_WEB ? 20 : 24,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  headerGradient: {
    paddingTop: 10,
    paddingHorizontal: IS_MOBILE_WEB ? 16 : 22,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutralBorderSoft || colors.border,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
    opacity: 0.5,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceGrayBlue || colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMain: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 12,
  },
  iconBadge: {
    width: IS_MOBILE_WEB ? 48 : 56,
    height: IS_MOBILE_WEB ? 48 : 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    alignItems: 'flex-end',
  },
  modalTitle: {
    fontSize: IS_MOBILE_WEB ? 16 : 18,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'right',
  },
  headlineValue: {
    marginTop: 4,
    fontSize: IS_MOBILE_WEB ? 22 : 26,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  body: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 200,
  },
});
