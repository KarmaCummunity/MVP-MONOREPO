/**
 * @file VisionSection
 * @description Vision and values section for the landing page
 * @module Landing/Components/Sections
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../../globals/colors';
import { Section } from '../Section';
import { IS_MOBILE_WEB } from '../../constants';
import { IconSizes } from '../../../../globals/constants';
import { styles } from '../../styles';

const mottoIconSize = IS_MOBILE_WEB ? IconSizes.small : IconSizes.medium;

export const VisionSection: React.FC = () => {
  const { t } = useTranslation('landing');
  return (
    <Section id="section-vision" title={t('vision.ourVision')} subtitle={t('vision.subtitle')} style={styles.sectionAltBackground}>
      <Text style={styles.paragraph}>
        <Text style={styles.emphasis}>{t('vision.paragraph1Emphasis')} </Text>
        {t('vision.paragraph1Rest')}
        {'\n\n'}
        <Text style={styles.emphasis}>{t('vision.paragraph2Emphasis')}</Text> {t('vision.paragraph2Rest')}
      </Text>
      <Text style={styles.paragraph}>{t('vision.paragraph3')}</Text>
      <View style={styles.mottoContainer}>
        <View style={styles.mottoCard}>
          <Ionicons name="swap-horizontal-outline" size={mottoIconSize} color={colors.info} style={styles.mottoIcon} />
          <Text style={styles.mottoText}>{t('vision.motto1')}</Text>
        </View>
        <View style={[styles.mottoCard, { backgroundColor: colors.greenBright + '15', borderColor: colors.greenBright + '40' }]}>
          <Ionicons name="gift-outline" size={mottoIconSize} color={colors.greenBright} style={styles.mottoIcon} />
          <Text style={styles.mottoText}>{t('vision.motto2')}</Text>
        </View>
      </View>
      <Text style={styles.paragraph}>{t('vision.paragraph4')}</Text>
      <View style={styles.visionHighlights}>
        <View style={styles.visionHighlight}>
          <Ionicons name="heart" size={mottoIconSize} color={colors.secondary} />
          <Text style={styles.visionHighlightText}>{t('vision.highlight1')}</Text>
        </View>
        <View style={styles.visionHighlight}>
          <Ionicons name="code-working" size={mottoIconSize} color={colors.info} />
          <Text style={styles.visionHighlightText}>{t('vision.highlight2')}</Text>
        </View>
        <View style={styles.visionHighlight}>
          <Ionicons name="people" size={mottoIconSize} color={colors.accent} />
          <Text style={styles.visionHighlightText}>{t('vision.highlight3')}</Text>
        </View>
        <View style={styles.visionHighlight}>
          <Ionicons name="globe" size={mottoIconSize} color={colors.greenBright} />
          <Text style={styles.visionHighlightText}>{t('vision.highlight4')}</Text>
        </View>
      </View>
    </Section>
  );
};
