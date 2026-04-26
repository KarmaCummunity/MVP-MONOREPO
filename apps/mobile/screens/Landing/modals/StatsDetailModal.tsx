import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../globals/colors';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import { IS_MOBILE_WEB as isMobileWeb } from '../constants';
import { apiService } from '../../../utils/apiService';
import { USE_BACKEND } from '../../../utils/dbConfig';
import { logger } from '../../../utils/loggerService';

export const StatsDetailModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  statType: string;
  statTitle: string;
  statValue: number;
  iconName: string;
  iconColor: string;
}> = ({ visible, onClose, statType, statTitle, statValue, iconName, iconColor }) => {
  const [detailData, setDetailData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadDetailData = useCallback(async () => {
    try {
      setIsLoading(true);
      logger.info('StatsDetailModal', `Loading detail data for ${statType}`);
      const response = await apiService.getStatDetails(statType);
      if (response.success && response.data) {
        setDetailData(response.data);
        logger.info('StatsDetailModal', `Loaded ${response.data.length} items for ${statType}`);
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

  const renderDetailItem = ({ item, index }: { item: any; index: number }) => {
    // Different rendering based on stat type
    switch (statType) {
      case 'siteVisits':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {new Date(item.timestamp || item.created_at).toLocaleString('he-IL')}
              </Text>
              {item.user_agent && (
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
                {item.name || item.email || 'משתמש'}
              </Text>
              <Text style={styles.detailItemSubtext}>
                הצטרף: {new Date(item.join_date || item.created_at).toLocaleDateString('he-IL')}
              </Text>
              {item.city && <Text style={styles.detailItemSubtext}>עיר: {item.city}</Text>}
            </View>
          </View>
        );

      case 'totalMoneyDonated':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {item.donor_name || 'תורם אנונימי'} • {item.amount?.toLocaleString('he-IL')} ₪
              </Text>
              <Text style={styles.detailItemSubtext}>
                {new Date(item.donation_date || item.created_at).toLocaleDateString('he-IL')}
              </Text>
              {item.category_name && (
                <Text style={styles.detailItemSubtext}>קטגוריה: {item.category_name}</Text>
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
                {item.title || item.item_name || 'פריט'}
              </Text>
              <Text style={styles.detailItemSubtext}>
                {new Date(item.created_at).toLocaleDateString('he-IL')}
              </Text>
              {item.donor_name && (
                <Text style={styles.detailItemSubtext}>תורם: {item.donor_name}</Text>
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
                {item.from_city || 'מוצא'} → {item.to_city || 'יעד'}
              </Text>
              <Text style={styles.detailItemSubtext}>
                {new Date(item.ride_date || item.created_at).toLocaleDateString('he-IL')}
              </Text>
              {item.driver_name && (
                <Text style={styles.detailItemSubtext}>נהג: {item.driver_name}</Text>
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
                {item.donor_name || 'תורם'}
                {item.amount && ` • ${item.amount.toLocaleString('he-IL')} ₪`}
              </Text>
              {item.frequency && (
                <Text style={styles.detailItemSubtext}>תדירות: {item.frequency}</Text>
              )}
              {item.start_date && (
                <Text style={styles.detailItemSubtext}>
                  החל מ: {new Date(item.start_date).toLocaleDateString('he-IL')}
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
                {item.title || 'משימה'}
              </Text>
              {item.category && (
                <Text style={styles.detailItemSubtext}>קטגוריה: {item.category}</Text>
              )}
              {item.updated_at && (
                <Text style={styles.detailItemSubtext}>
                  הושלמה: {new Date(item.updated_at).toLocaleDateString('he-IL')}
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
              <Ionicons name={iconName as any} size={isMobileWeb ? 28 : 36} color={iconColor} />
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>{statTitle}</Text>
                <Text style={styles.modalSubtitle}>
                  {statValue.toLocaleString('he-IL')} {statType === 'totalMoneyDonated' || statType === 'recurringDonationsAmount' ? '₪' : 'פריטים'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={isMobileWeb ? 24 : 32} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {isLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={colors.info} />
                <Text style={styles.modalLoadingText}>טוען פרטים...</Text>
              </View>
            ) : detailData.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Ionicons name="information-circle-outline" size={isMobileWeb ? 48 : 64} color={colors.textSecondary} />
                <Text style={styles.modalEmptyText}>אין נתונים להצגה</Text>
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

