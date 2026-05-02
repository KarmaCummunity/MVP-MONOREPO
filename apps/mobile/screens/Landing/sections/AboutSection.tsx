import React from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../globals/colors';
import { Section } from '../components';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import { IS_MOBILE_WEB as isMobileWeb } from '../constants';
import { logger } from '../../../utils/loggerService';

export const AboutSection: React.FC = () => (
  <Section id="section-about" title="קהילה אחת. מטרה אחת." subtitle="הסיפור של קהילת קארמה">
    <Text style={styles.paragraph}>
      בעולם מלא ברעש, אנחנו מאמינים בכוח השקט של עשיית הטוב. קהילת קארמה נולדה מתוך צורך פשוט: לחבר בין אנשים. בין אלה שצריכים עזרה, לבין אלה שיכולים ורוצים להושיט יד. ראינו את הכפילויות, את חוסר האמון ואת המאמצים המפוזרים, והחלטנו ליצור פלטפורמה אחת שמאחדת את כולם.
    </Text>
    <Text style={styles.paragraph}>
      בלי פרסומות, בלי אינטרסים, רק טכנולוגיה בשירות האנושיות. המשימה שלנו היא להפוך את הנתינה לחלק טבעי ופשוט מהיום-יום של כולנו, וליצור חברה ישראלית מחוברת, תומכת ואכפתית יותר.
    </Text>
    <Text style={[styles.sectionSubTitle, { marginTop: 30 }]}>מילה מהמייסד, נוה סרוסי</Text>
    <Text style={styles.paragraph}>
      מגיל צעיר הרגשתי פריבילגיה ושהחיים שלי מסודרים. דווקא בצבא, למרות שהגעתי לתפקיד טוב בתור מתכנת מטוסים, לא הרגשתי את המשמעות שחיפשתי. כל הזמן חשבתי איך אני יכול להביא שינוי אמיתי וטוב לעולם. תמיד עניין אותי לעבוד בסקיילים גדולים ולהשפיע לטובה על כמה שיותר אנשים.
    </Text>
    <Text style={styles.paragraph}>
      קהילת קארמה היא הדרך שלי להפוך את הטוב לנגיש יותר, ליצור פלטפורמה שמחברת בין אנשים שרוצים לעזור לאנשים שצריכים עזרה. אני מאמין בכוח של קהילה לשנות מציאות, ואשמח שתצטרפו אליי למסע הזה.
    </Text>

    {/* WhatsApp CTA Button */}
    <View style={styles.ctaRow}>
      <TouchableOpacity
        style={[styles.contactButton, { backgroundColor: colors.success }]}
        onPress={() => {
          logger.info('LandingSite', 'Click - whatsapp from founder section');
          Linking.openURL('https://wa.me/972528616878');
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="logo-whatsapp" color={colors.white} size={isMobileWeb ? 14 : 18} />
        <Text style={styles.contactButtonText}>שלחו לי ווטסאפ</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.githubLinkContainer}>
      <TouchableOpacity
        style={styles.githubLinkButton}
        onPress={() => { logger.info('LandingSite', 'Click - github org'); Linking.openURL('https://github.com/KarmaCummunity'); }}
      >
        <Ionicons name="logo-github" size={isMobileWeb ? 18 : 24} color={colors.textPrimary} />
        <View style={styles.githubLinkTextContainer}>
          <Text style={styles.githubLinkTitle}>גיטהאב - הקוד הפתוח</Text>
          <Text style={styles.githubLinkDescription}>זה הקוד של האפליקציה. כולם מוזמנים להסתכל ולעזור</Text>
        </View>
        <Ionicons name="arrow-forward-outline" size={isMobileWeb ? 16 : 20} color={colors.info} />
      </TouchableOpacity>
    </View>
  </Section>
);

