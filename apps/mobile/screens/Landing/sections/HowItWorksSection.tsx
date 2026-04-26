import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../globals/colors';
import { Section } from '../components';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import { IS_MOBILE_WEB as isMobileWeb } from '../constants';

export const HowItWorksSection = () => (
  <Section id="section-how" title="איך זה עובד?" subtitle="תהליך פשוט וברור שמחבר בין אנשים">
    <Text style={styles.paragraph}>
      קהילת קארמה בנויה על עקרון פשוט: כל אחד יכול לתת וכל אחד יכול לקבל. התהליך שלנו נועד להיות פשוט, שקוף וידידותי.
    </Text>
    <View style={styles.stepsRow}>
      <View style={styles.stepCard}>
        <View style={styles.stepNumberBadge}>
          <Text style={styles.stepNumber}>1</Text>
        </View>
        <Ionicons name="person-add-outline" size={isMobileWeb ? 24 : 32} color={colors.info} style={styles.stepIcon} />
        <Text style={styles.stepTitle}>הצטרפו לקהילה</Text>
        <Text style={styles.stepText}>
          הירשמו בכמה שניות - רק פרטים בסיסיים. ספרו לנו מה מעניין אתכם, איפה אתם, ומה אתם יכולים להציע או מה אתם צריכים. אין צורך במידע מיותר, רק מה שחשוב.
        </Text>
      </View>
      <View style={styles.stepCard}>
        <View style={styles.stepNumberBadge}>
          <Text style={styles.stepNumber}>2</Text>
        </View>
        <Ionicons name="create-outline" size={isMobileWeb ? 24 : 32} color={colors.accent} style={styles.stepIcon} />
        <Text style={styles.stepTitle}>פרסמו או חפשו</Text>
        <Text style={styles.stepText}>
          צריכים עזרה? פרסמו בקשה ברורה עם מה אתם צריכים, מתי ואיפה. רוצים לעזור? פרסמו הצעה עם מה אתם יכולים לתת. או פשוט דפדפו בפיד וראו מה קורה סביבכם.
        </Text>
      </View>
      <View style={styles.stepCard}>
        <View style={styles.stepNumberBadge}>
          <Text style={styles.stepNumber}>3</Text>
        </View>
        <Ionicons name="search-outline" size={isMobileWeb ? 24 : 32} color={colors.accent} style={styles.stepIcon} />
        <Text style={styles.stepTitle}>גלו הזדמנויות</Text>
        <Text style={styles.stepText}>
          המפה החכמה שלנו תראה לכם איפה צריכים אתכם, ממש ליד הבית. הפיד האישי שלכם יציג לכם בקשות והצעות רלוונטיות לפי המיקום והעניין שלכם.
        </Text>
      </View>
      <View style={styles.stepCard}>
        <View style={styles.stepNumberBadge}>
          <Text style={styles.stepNumber}>4</Text>
        </View>
        <Ionicons name="chatbubble-ellipses-outline" size={isMobileWeb ? 24 : 32} color={colors.secondary} style={styles.stepIcon} />
        <Text style={styles.stepTitle}>צרו קשר</Text>
        <Text style={styles.stepText}>
          ראיתם משהו שמעניין אתכם? שלחו הודעה ישירה, תאמו פרטים, הכירו את האדם שמאחורי הבקשה או ההצעה. הכל שקוף, בטוח ופשוט.
        </Text>
      </View>
      <View style={[styles.stepCard, { backgroundColor: colors.greenBright + '12', borderColor: colors.greenBright + '40' }]}>
        <View style={[styles.stepNumberBadge, { backgroundColor: colors.greenBright }]}>
          <Text style={styles.stepNumber}>5</Text>
        </View>
        <Ionicons name="heart-outline" size={isMobileWeb ? 24 : 32} color={colors.greenBright} style={styles.stepIcon} />
        <Text style={styles.stepTitle}>עשו טוב והרגישו את ההבדל</Text>
        <Text style={styles.stepText}>
          תאמו, פגשו, עזרו או קבלו עזרה. כל פעולה כזו יוצרת קשר אנושי אמיתי ומחזקת את הקהילה. אתם תראו את ההשפעה שלכם, והקהילה תראה את התרומה שלכם.
        </Text>
      </View>
    </View>
    <View style={styles.howItWorksNote}>
      <Ionicons name="information-circle-outline" size={isMobileWeb ? 18 : 24} color={colors.info} />
      <Text style={styles.howItWorksNoteText}>
        הכל בחינם, הכל שקוף, הכל למען הקהילה. אין בירוקרטיה, אין עמלות, רק אנשים שעוזרים לאנשים.
      </Text>
    </View>
  </Section>
);

