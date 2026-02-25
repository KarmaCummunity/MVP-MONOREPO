/**
 * @file FAQSection
 * @description Section with frequently asked questions
 * @module Landing/Components/Sections
 */

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Section } from '../Section';
import { FAQItem } from './FAQItem';
import { styles } from '../../styles';

export const FAQSection: React.FC = () => {
  const { t } = useTranslation('landing');
  const faqData = [
    { questionKey: 'legacy.faq.q1', answerKey: 'legacy.faq.a1', icon: 'cash-outline' },
    { questionKey: 'legacy.faq.q2', answerKey: 'legacy.faq.a2', icon: 'heart-outline' },
    { questionKey: 'legacy.faq.q3', answerKey: 'legacy.faq.a3', icon: 'phone-portrait-outline' },
    { questionKey: 'legacy.faq.q4', answerKey: 'legacy.faq.a4', icon: 'ban-outline' },
    { questionKey: 'legacy.faq.q5', answerKey: 'legacy.faq.a5', icon: 'play-circle-outline' },
    { questionKey: 'legacy.faq.q6', answerKey: 'legacy.faq.a6', icon: 'people-circle-outline' },
    { questionKey: 'legacy.faq.q7', answerKey: 'legacy.faq.a7', icon: 'shield-checkmark-outline' },
    { questionKey: 'legacy.faq.q8', answerKey: 'legacy.faq.a8', icon: 'star-outline' },
    { questionKey: 'legacy.faq.q9', answerKey: 'legacy.faq.a9', icon: 'code-working-outline' },
    { questionKey: 'legacy.faq.q10', answerKey: 'legacy.faq.a10', icon: 'help-circle-outline' },
  ];

  return (
    <Section id="section-faq" title={t('legacy.faq.title')} subtitle={t('legacy.faq.subtitle')}>
      <View style={styles.faqContainer}>
        {faqData.map((item, index) => (
          <FAQItem
            key={index}
            question={t(item.questionKey)}
            answer={t(item.answerKey)}
            icon={item.icon}
          />
        ))}
      </View>
    </Section>
  );
};
