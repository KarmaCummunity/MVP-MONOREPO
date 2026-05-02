import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import colors, { SCRIM_BLACK_40 } from '../../../globals/colors';
import { landingSiteScreenStyles as landingStyles } from '../landingSiteScreenStyles';
import { IS_MOBILE_WEB as isMobileWeb } from '../constants';
import { apiService } from '../../../utils/apiService';
import { USE_BACKEND } from '../../../utils/dbConfig';
import { logger } from '../../../utils/loggerService';
import {
  renderCompletedRideRow,
  renderCompletedTaskRow,
  renderDonorRecurringRow,
  renderItemDonationRow,
  renderMoneyDonationRow,
  renderSiteVisitRow,
  renderTotalUserRow,
  renderUnknownStatRow,
  type StatDetailRowStyles,
} from './statsDetailModalRows';

type IonIconName = ComponentProps<typeof Ionicons>['name'];

type StatType =
  | 'siteVisits'
  | 'totalUsers'
  | 'totalMoneyDonated'
  | 'itemDonations'
  | 'completedRides'
  | 'uniqueDonors'
  | 'recurringDonationsAmount'
  | 'completedTasks';

const KNOWN_STAT_TYPES: ReadonlySet<string> = new Set<StatType>([
  'siteVisits',
  'totalUsers',
  'totalMoneyDonated',
  'itemDonations',
  'completedRides',
  'uniqueDonors',
  'recurringDonationsAmount',
  'completedTasks',
]);

function isStatType(value: string): value is StatType {
  return KNOWN_STAT_TYPES.has(value);
}

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
  return `${value.toLocaleString(loc)} ${suffix}`.trim();
}

function formatHeadlineForApiStat(
  statType: string,
  value: number,
  locale: string | undefined,
  t: (k: string) => string,
): string {
  if (isStatType(statType)) {
    return formatStatHeadline(statType, value, locale, t);
  }
  const loc = locale === 'he' ? 'he-IL' : locale ?? 'en-US';
  return `${value.toLocaleString(loc)} ${t('statModal.suffixGeneric')}`.trim();
}

export const StatsDetailModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  statType: string;
  statTitle: string;
  statValue: number;
  iconName: IonIconName;
  iconColor: string;
}> = ({ visible, onClose, statType, statTitle, statValue, iconName, iconColor }) => {
  const { t } = useTranslation('communityStats');
  const { t: tCommon } = useTranslation('common');
  const { i18n } = useTranslation();
  const locale = i18n.language;

  const [detailData, setDetailData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const headline = useMemo(
    () => formatHeadlineForApiStat(statType, statValue, locale, t),
    [statType, statValue, locale, t],
  );

  const loadDetailData = useCallback(async () => {
    try {
      setIsLoading(true);
      logger.info('StatsDetailModal', `Loading detail data for ${statType}`);
      const response = await apiService.getStatDetails(statType);
      if (response.success && response.data && Array.isArray(response.data)) {
        setDetailData(response.data as Record<string, unknown>[]);
        logger.info('StatsDetailModal', `Loaded ${response.data.length} items for ${statType}`);
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
    if (!visible) {
      return;
    }
    if (USE_BACKEND) {
      loadDetailData().catch((err: unknown) => {
        logger.error('StatsDetailModal', 'loadDetailData rejected', { error: err, statType });
      });
      return;
    }
    setDetailData([]);
  }, [visible, loadDetailData, statType]);

  const rowStyles = useMemo(
    (): StatDetailRowStyles => ({
      detailItem: landingStyles.detailItem,
      detailItemNumber: landingStyles.detailItemNumber,
      detailItemContent: landingStyles.detailItemContent,
      detailItemText: landingStyles.detailItemText,
      detailItemSubtext: landingStyles.detailItemSubtext,
    }),
    [],
  );

  const renderDetailRow = useCallback(
    (item: Record<string, unknown>, index: number): React.ReactElement => {
      switch (statType) {
        case 'siteVisits':
          return renderSiteVisitRow(item, index, locale, rowStyles);
        case 'totalUsers':
          return renderTotalUserRow(item, index, locale, rowStyles);
        case 'totalMoneyDonated':
          return renderMoneyDonationRow(item, index, locale, rowStyles);
        case 'itemDonations':
          return renderItemDonationRow(item, index, locale, rowStyles);
        case 'completedRides':
          return renderCompletedRideRow(item, index, locale, rowStyles);
        case 'uniqueDonors':
        case 'recurringDonationsAmount':
          return renderDonorRecurringRow(item, index, locale, rowStyles);
        case 'completedTasks':
          return renderCompletedTaskRow(item, index, locale, rowStyles);
        default:
          return renderUnknownStatRow(t('statModal.unknownRow'), index, rowStyles);
      }
    },
    [statType, locale, rowStyles, t],
  );

  const renderItem = useCallback<ListRenderItem<Record<string, unknown>>>(
    ({ item, index }) => renderDetailRow(item, index),
    [renderDetailRow],
  );

  const sheetAlign = Platform.OS === 'web' ? 'center' : 'flex-end';

  let sheetPaddingBottom = 16;
  if (Platform.OS === 'ios') {
    sheetPaddingBottom = 28;
  } else if (Platform.OS === 'android') {
    sheetPaddingBottom = 20;
  }

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
                  <Ionicons name={iconName} size={isMobileWeb ? 26 : 30} color={iconColor} />
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
              <View style={landingStyles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={iconColor} />
                <Text style={landingStyles.modalLoadingText}>{t('statModal.loadingDetails')}</Text>
              </View>
            ) : detailData.length === 0 ? (
              <View style={landingStyles.modalEmptyContainer}>
                <Ionicons name="layers-outline" size={isMobileWeb ? 44 : 56} color={colors.textSecondary} />
                <Text style={landingStyles.modalEmptyText}>{t('statModal.noData')}</Text>
              </View>
            ) : (
              <FlatList
                data={detailData}
                renderItem={renderItem}
                keyExtractor={(_, index) => `${statType}-${index}`}
                showsVerticalScrollIndicator
                contentContainerStyle={landingStyles.detailList}
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
    paddingHorizontal: isMobileWeb ? 12 : 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    maxHeight: '88%',
    backgroundColor: colors.white,
    borderRadius: isMobileWeb ? 20 : 24,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  headerGradient: {
    paddingTop: 10,
    paddingHorizontal: isMobileWeb ? 16 : 22,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutralBorderSoft,
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
    width: isMobileWeb ? 48 : 56,
    height: isMobileWeb ? 48 : 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    alignItems: 'flex-end',
  },
  modalTitle: {
    fontSize: isMobileWeb ? 16 : 18,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'right',
  },
  headlineValue: {
    marginTop: 4,
    fontSize: isMobileWeb ? 22 : 26,
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
