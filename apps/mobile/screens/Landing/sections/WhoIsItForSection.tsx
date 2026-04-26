import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../globals/colors';
import { Section } from '../components';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import { IS_MOBILE_WEB as isMobileWeb } from '../constants';

export const WhoIsItForSection: React.FC<{ onDonate: () => void }> = ({ onDonate }) => (
  <Section id="section-who" title="למי זה מתאים?" subtitle="לכולם. באמת." style={styles.sectionAltBackground}>
    <Text style={styles.paragraph}>
      <Text style={styles.emphasis}>קהילת קארמה מיועדת לכולם.</Text> עשירים ועניים, מרכז ופריפריה, לא משנה דת, גזע, מין, לאום ואפילו לא מיקום פיזי. כל אחד יכול לתת וכל אחד יכול לקבל.
    </Text>
    <View style={styles.whoContent}>
      <View style={styles.whoMainCard}>
        <Ionicons name="people-outline" size={isMobileWeb ? 32 : 48} color={colors.info} style={styles.whoMainIcon} />
        <Text style={styles.splitTitle}>לאנשים פרטיים</Text>
        <Text style={styles.paragraph}>
          בשלבים הראשונים, KarmaCommunity מתמקדת באנשים פרטיים - שכנים, חברים, וכל מי שרוצה לתת מהזמן, הידע או החפצים שלו כדי לעזור לאחרים.
        </Text>
        <View style={styles.iconBullets}>
          <View style={styles.iconBulletRow}><Ionicons name="gift-outline" size={isMobileWeb ? 14 : 18} color={colors.secondary} /><Text style={styles.iconBulletText}>שיתוף חפצים, מזון וציוד</Text></View>
          <View style={styles.iconBulletRow}><Ionicons name="time-outline" size={isMobileWeb ? 14 : 18} color={colors.accent} /><Text style={styles.iconBulletText}>התנדבות וסיוע נקודתי</Text></View>
          <View style={styles.iconBulletRow}><Ionicons name="school-outline" size={isMobileWeb ? 14 : 18} color={colors.info} /><Text style={styles.iconBulletText}>שיתוף ידע ושיעורי עזר</Text></View>
          <View style={styles.iconBulletRow}><Ionicons name="heart-outline" size={isMobileWeb ? 14 : 18} color={colors.greenBright} /><Text style={styles.iconBulletText}>יצירת קשרים אנושיים אמיתיים</Text></View>
          <View style={styles.iconBulletRow}><Ionicons name="people-outline" size={isMobileWeb ? 14 : 18} color={colors.success} /><Text style={styles.iconBulletText}>כמובן כולם מוזמנים להתנדב ולתרום גם לקהילה עצמה ולהיות חלק מהמייסדים</Text></View>
        </View>

        {/* Donation Button */}
        <TouchableOpacity
          style={styles.donationCtaButton}
          onPress={onDonate}
          activeOpacity={0.8}
        >
          <Ionicons name="heart" size={isMobileWeb ? 18 : 24} color={colors.white} />
          <Text style={styles.donationCtaButtonText}>תרמו לנו</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.whoFutureCard}>
        <Ionicons name="business-outline" size={isMobileWeb ? 24 : 32} color={colors.textSecondary} style={styles.whoFutureIcon} />
        <Text style={styles.whoFutureTitle}>עמותות וארגונים - בהמשך</Text>
        <Text style={styles.whoFutureText}>
          בשלבים הבאים נחבר גם עמותות וארגונים עם כלים ייעודיים לניהול מתנדבים, תרומות ופניות. דגש חשוב - זה יקרה רק אחרי שנבסס קהילה חזקה של אנשים פרטיים.
        </Text>
      </View>
    </View>
  </Section>
);

