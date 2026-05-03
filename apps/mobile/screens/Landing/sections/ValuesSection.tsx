import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../globals/colors';
import { Section } from '../components';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import { IS_MOBILE_WEB as isMobileWeb } from '../constants';

export const ValuesSection = () => {
  const valuePills = [
    'שקיפות מלאה',
    'אמון ובטיחות',
    'קהילתיות פעילה',
    'אחריות משותפת',
    'גישה מכל מקום',
    'מדידה ולמידה',
  ];
  const commitments = [
    { icon: 'shield-checkmark-outline', text: 'אימות משתמשים וארגונים לפני עלייה לאוויר', color: colors.success },
    { icon: 'sparkles-outline', text: 'חוויית שימוש נוחה ונקייה מהסחות דעת', color: colors.secondary },
    { icon: 'leaf-outline', text: 'התפתחות ברת קיימא – בלי פרסומות ובלי דאטה מיותר', color: colors.greenBright },
  ];

  return (
    <Section id="section-values" title="הערכים שמנחים אותנו" subtitle="מה הופך את Karma Community לקהילה בטוחה ואמינה" style={styles.sectionAltBackground}>
      <Text style={styles.paragraph}>
        אנו מובילים שינוי באמצעות מערכת שמעמידה את האדם במרכז. כל פיצ׳ר נבחן לפי תרומתו לשקיפות, לחיבורים אנושיים וליכולת למדוד השפעה אמיתית.
      </Text>
      <View style={styles.valuesRow}>
        {valuePills.map((value) => (
          <View key={value} style={styles.valuePill}>
            <Text style={styles.valuePillText}>{value}</Text>
          </View>
        ))}
      </View>
      <View style={styles.trustList}>
        {commitments.map((item) => (
          <View key={item.text} style={styles.trustRow}>
            <Ionicons name={item.icon as any} size={isMobileWeb ? 14 : 18} color={item.color} />
            <Text style={styles.trustText}>{item.text}</Text>
          </View>
        ))}
      </View>
    </Section>
  );
};

