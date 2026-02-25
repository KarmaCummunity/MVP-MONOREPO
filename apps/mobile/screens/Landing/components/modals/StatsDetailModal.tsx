/**
 * @file StatsDetailModal
 * @description Modal displaying detailed statistics data from the backend
 * @module Landing/Components/Modals
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../../globals/colors';
import { logger } from '../../../../utils/loggerService';
import { apiService } from '../../../../src/api/api.service';
import { USE_BACKEND } from '../../../../utils/dbConfig';
import { IS_MOBILE_WEB } from '../../constants';
import { styles } from '../../styles';

interface StatsDetailModalProps {
  visible: boolean;
  onClose: () => void;
  statType: string;
  statTitle: string;
  statValue: number;
  iconName: string;
  iconColor: string;
}

const parseDate = (val: unknown): Date => {
  if (val == null || val === '') return new Date(0);
  if (typeof val === 'string' || typeof val === 'number' || val instanceof Date) return new Date(val);
  return new Date(0);
};

export const StatsDetailModal: React.FC<StatsDetailModalProps> = ({
  visible,
  onClose,
  statType,
  statTitle,
  statValue,
  iconName,
  iconColor,
}) => {
  const { t } = useTranslation('landing');
  const [detailData, setDetailData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadDetailData = useCallback(async () => {
    try {
      setIsLoading(true);
      logger.info('StatsDetailModal', `Loading detail data for ${statType}`);
      const response = await apiService.getStatDetails(statType);
      const data = response.data as Record<string, unknown>[];
      if (response.success && data) {
        setDetailData(data);
        logger.info('StatsDetailModal', `Loaded ${data.length} items for ${statType}`);
      }
    } catch (error) {
      logger.error('StatsDetailModal', 'Failed to load detail data', { error, statType });
    } finally {
      setIsLoading(false);
    }
  }, [statType]);

  useEffect(() => {
    if (visible && USE_BACKEND) {
      loadDetailData();
    }
  }, [visible, loadDetailData]);

  const renderDetailItem = ({ item, index }: { item: Record<string, unknown>; index: number }) => {
    switch (statType) {
      case 'siteVisits':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {parseDate(item.timestamp ?? item.created_at).toLocaleString('he-IL')}
              </Text>
              {typeof item.user_agent === 'string' && (
                <Text style={styles.detailItemSubtext}>{item.user_agent.substring(0, 50)}...</Text>
              )}
            </View>
          </View>
        );

      case 'totalUsers':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {String(item.name ?? item.email ?? t('statsDetail.user'))}
              </Text>
              <Text style={styles.detailItemSubtext}>
                {t('statsDetail.joined')}: {parseDate(item.join_date ?? item.created_at).toLocaleDateString('he-IL')}
              </Text>
              {item.city != null && <Text style={styles.detailItemSubtext}>{t('statsDetail.city')}: {String(item.city)}</Text>}
            </View>
          </View>
        );

      case 'totalMoneyDonated':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {String(item.donor_name ?? t('statsDetail.anonymousDonor'))} • {typeof item.amount === 'number' ? item.amount.toLocaleString('he-IL') : String(item.amount ?? '')} ₪
              </Text>
              <Text style={styles.detailItemSubtext}>
                {parseDate(item.donation_date ?? item.created_at).toLocaleDateString('he-IL')}
              </Text>
              {item.category_name != null && (
                <Text style={styles.detailItemSubtext}>{t('statsDetail.category')}: {String(item.category_name)}</Text>
              )}
            </View>
          </View>
        );

      case 'itemDonations':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {String(item.title ?? item.item_name ?? t('statsDetail.item'))}
              </Text>
              <Text style={styles.detailItemSubtext}>
                {parseDate(item.created_at).toLocaleDateString('he-IL')}
              </Text>
              {item.donor_name != null && (
                <Text style={styles.detailItemSubtext}>{t('statsDetail.donor')}: {String(item.donor_name)}</Text>
              )}
            </View>
          </View>
        );

      case 'completedRides':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {String(item.from_city ?? t('statsDetail.origin'))} → {String(item.to_city ?? t('statsDetail.destination'))}
              </Text>
              <Text style={styles.detailItemSubtext}>
                {parseDate(item.ride_date ?? item.created_at).toLocaleDateString('he-IL')}
              </Text>
              {item.driver_name != null && (
                <Text style={styles.detailItemSubtext}>{t('statsDetail.driver')}: {String(item.driver_name)}</Text>
              )}
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
                {String(item.donor_name ?? t('statsDetail.donor'))}
                {item.amount != null && typeof item.amount === 'number' && t('statsDetail.amountWithCurrency', { amount: item.amount.toLocaleString('he-IL') })}
              </Text>
              {item.frequency != null && (
                <Text style={styles.detailItemSubtext}>{t('statsDetail.frequency')}: {String(item.frequency)}</Text>
              )}
              {item.start_date != null && (
                <Text style={styles.detailItemSubtext}>
                  {t('statsDetail.fromDate')}: {parseDate(item.start_date).toLocaleDateString('he-IL')}
                </Text>
              )}
            </View>
          </View>
        );

      case 'completedTasks':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {String(item.title ?? t('statsDetail.task'))}
              </Text>
              {item.category != null && (
                <Text style={styles.detailItemSubtext}>{t('statsDetail.category')}: {String(item.category)}</Text>
              )}
              {item.updated_at != null && (
                <Text style={styles.detailItemSubtext}>
                  {t('statsDetail.completed')}: {parseDate(item.updated_at).toLocaleDateString('he-IL')}
                </Text>
              )}
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={IS_MOBILE_WEB ? 28 : 36} color={iconColor} />
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>{statTitle}</Text>
                <Text style={styles.modalSubtitle}>
                  {statValue.toLocaleString('he-IL')} {statType === 'totalMoneyDonated' || statType === 'recurringDonationsAmount' ? '₪' : t('statsDetail.items')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={IS_MOBILE_WEB ? 24 : 32} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {isLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={colors.info} />
                <Text style={styles.modalLoadingText}>{t('statsDetail.loadingDetails')}</Text>
              </View>
            ) : detailData.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Ionicons name="information-circle-outline" size={IS_MOBILE_WEB ? 48 : 64} color={colors.textSecondary} />
                <Text style={styles.modalEmptyText}>{t('statsDetail.noData')}</Text>
              </View>
            ) : (
              <FlatList
                data={detailData}
                renderItem={renderDetailItem}
                keyExtractor={(item, index) => `${statType}-${index}`}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.detailList}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
