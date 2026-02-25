import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import StatMiniCharts from './StatMiniCharts';

export type StatDetails = {
  key: string;
  title: string;
  icon?: string; // emoji or Ionicon name
  value: string;
  description?: string;
  bullets?: string[];
  color?: string;
  breakdownByCity?: Array<{ label: string; value: number }>;
  trend?: number[]; // last N periods
};

interface StatDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  details: StatDetails | null;
}

const StatDetailsModal: React.FC<StatDetailsModalProps> = ({ visible, onClose, details }) => {
  if (!details) return null;

  const isEmoji = details.icon && /\p{Emoji}/u.test(details.icon);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              {details.icon ? (
                isEmoji ? (
                  <Text style={styles.emoji}>{details.icon}</Text>
                ) : (
                  <Ionicons name={details.icon as any} size={24} color={details.color || colors.info} />
                )
              ) : null}
              <Text style={styles.title}>{details.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityLabel={(require('i18next') as any).t('common:close')}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.value}>{details.value}</Text>
            {details.description ? (
              <Text style={styles.description}>{details.description}</Text>
            ) : null}

            {(details.breakdownByCity || details.trend) ? (
              <View style={{ marginTop: 12 }}>
                <StatMiniCharts breakdown={details.breakdownByCity} trend={details.trend} accentColor={details.color || colors.info} />
              </View>
            ) : null}

            {details.bullets && details.bullets.length > 0 ? (
              <View style={styles.list}>
                {details.bullets.map((b, idx) => (
                  <View key={idx} style={styles.listItem}>
                    <View style={styles.dot} />
                    <Text style={styles.listText}>{b}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>{(require('i18next') as any).t('common:close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: FontSizes.heading2,
  },
  title: {
    fontSize: FontSizes.medium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  value: {
    fontSize: FontSizes.heading1,
    color: colors.legacyDarkBlue,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'right',
  },
  description: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'right',
  },
  list: {
    marginTop: 12,
    gap: 8,
  },
  listItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.info,
    marginLeft: 8,
    marginRight: 4,
  },
  listText: {
    flex: 1,
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  closeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeText: {
    color: colors.buttonText,
    fontWeight: '700',
    fontSize: FontSizes.body,
  },
});

export default StatDetailsModal;


