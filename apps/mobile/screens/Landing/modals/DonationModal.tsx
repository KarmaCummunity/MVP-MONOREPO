import React from 'react';
import { Linking, Modal, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../globals/colors';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import { IS_MOBILE_WEB as isMobileWeb } from '../constants';
import { logger } from '../../../utils/loggerService';

// Donation Modal Component
export const DonationModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
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
              <Ionicons name="heart" size={isMobileWeb ? 32 : 40} color={colors.secondary} />
              <View style={styles.donationModalTitleContainer}>
                <Text style={styles.donationModalTitle}>תרמו לנו</Text>
                <Text style={styles.donationModalSubtitle}>כל תרומה עוזרת לנו לגדול</Text>
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
                מוזמנים להעביר למספר 0528616878 לנוה המייסד בביט/פייבוקס
              </Text>
            </View>

            <View style={styles.donationButtonsContainer}>
              <TouchableOpacity
                style={[styles.donationButton, styles.donationButtonWhatsApp]}
                onPress={handleWhatsApp}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={isMobileWeb ? 20 : 28} color={colors.white} />
                <Text style={styles.donationButtonText}>ווטסאפ</Text>
              </TouchableOpacity>

            </View>

            <Text style={styles.donationNoteText}>
              תודה על התמיכה שלכם! כל תרומה עוזרת לנו להמשיך ולפתח את הקהילה.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

