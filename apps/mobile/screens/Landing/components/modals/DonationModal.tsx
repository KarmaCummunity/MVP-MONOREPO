/**
 * @file DonationModal
 * @description Modal for donation options and contact
 * @module Landing/Components/Modals
 */

import React from 'react';
import { View, Text, Modal, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../../globals/colors';
import { logger } from '../../../../utils/loggerService';
import { IS_MOBILE_WEB } from '../../constants';
import { styles } from '../../styles';

interface DonationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DonationModal: React.FC<DonationModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation('landing');

  const handleWhatsApp = () => {
    logger.info('DonationModal', 'Click - whatsapp');
    Linking.openURL('https://wa.me/972528616878');
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
              <Ionicons name="heart" size={IS_MOBILE_WEB ? 32 : 40} color={colors.secondary} />
              <View style={styles.donationModalTitleContainer}>
                <Text style={styles.donationModalTitle}>{t('legacy.donationModal.title')}</Text>
                <Text style={styles.donationModalSubtitle}>{t('legacy.donationModal.subtitle')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={IS_MOBILE_WEB ? 24 : 32} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.donationModalContent}>
            <View style={styles.donationMessageContainer}>
              <Ionicons name="information-circle" size={IS_MOBILE_WEB ? 24 : 32} color={colors.info} />
              <Text style={styles.donationMessageText}>
                {t('legacy.donationModal.message')}
              </Text>
            </View>

            <View style={styles.donationButtonsContainer}>
              <TouchableOpacity
                style={[styles.donationButton, styles.donationButtonWhatsApp]}
                onPress={handleWhatsApp}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={IS_MOBILE_WEB ? 20 : 28} color={colors.white} />
                <Text style={styles.donationButtonText}>{t('legacy.donationModal.whatsappButton')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.donationNoteText}>
              {t('legacy.donationModal.note')}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};
