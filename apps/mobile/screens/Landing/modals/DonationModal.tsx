import React from 'react';
import { Linking, Modal, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import { IS_MOBILE_WEB as isMobileWeb, WHATSAPP_URL } from '../constants';
import { logger } from '../../../utils/loggerService';

// Donation Modal Component
export const DonationModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { t } = useTranslation('landing');

  const handleWhatsApp = () => {
    logger.info('DonationModal', 'Click - whatsapp');
    Linking.openURL(WHATSAPP_URL);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.donationModalContainer}>
          <View style={styles.donationModalHeader}>
            <View style={styles.donationModalTitleRow}>
              <Ionicons name="heart" size={isMobileWeb ? 32 : 40} color={colors.secondary} />
              <View style={styles.donationModalTitleContainer}>
                <Text style={styles.donationModalTitle}>{t('donationModal.title')}</Text>
                <Text style={styles.donationModalSubtitle}>{t('donationModal.subtitle')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={isMobileWeb ? 24 : 32} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.donationModalContent}>
            <View style={styles.donationMessageContainer}>
              <Ionicons name="information-circle" size={isMobileWeb ? 24 : 32} color={colors.info} />
              <Text style={styles.donationMessageText}>
                {t('donationModal.paymentInfo')}
              </Text>
            </View>

            <View style={styles.donationNonprofitNoticeContainer}>
              <Ionicons
                name="alert-circle"
                size={isMobileWeb ? 22 : 28}
                color={colors.warning}
              />
              <Text style={styles.donationNonprofitNoticeText}>
                {t('donationModal.nonprofitNotice')}
              </Text>
            </View>

            <View style={styles.donationButtonsContainer}>
              <TouchableOpacity
                style={[styles.donationButton, styles.donationButtonWhatsApp]}
                onPress={handleWhatsApp}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={isMobileWeb ? 20 : 28} color={colors.white} />
                <Text style={styles.donationButtonText}>{t('donationModal.whatsappButton')}</Text>
              </TouchableOpacity>

            </View>

            <Text style={styles.donationNoteText}>
              {t('donationModal.thankYouNote')}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

