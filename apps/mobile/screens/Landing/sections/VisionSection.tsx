import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../globals/colors';
import { Section } from '../components';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import { IS_MOBILE_WEB as isMobileWeb } from '../constants';

export const VisionSection: React.FC = () => (
  <Section id="section-vision" title="החזון שלנו" subtitle="הקיבוץ הקפיטליסטי" style={styles.sectionAltBackground}>
    <Text style={styles.paragraph}>
      <Text style={styles.emphasis}>קיבוץ דגיטלי בעולם קפיטליסטי. </Text>רשת חברתית לאיחוד, ריכוז, הנגשה, והפצת פילנתרופיה ועשייה חברתית מכל הסוגים ולכל האנשים.
      {"\n\n"}
      <Text style={styles.emphasis}>כרגע אנחנו בתהליך הקמה.</Text> כל מה שרשום בהמשך הוא חלק מהחזון שאנחנו רוצים לבנות, וכרגע אנחנו מזמינים אתכם לעזור לנו לבנות את זה.
    </Text>
    <Text style={styles.paragraph}>
      אנחנו מזמינים אתכם להצטרף אלינו לשנות את העולם וליצור שינוי חברתי אמיתי. להיות חלק ממשהו גדול, מוסרי ברמה הכי גבוהה, טכנולוגי, חברתי ועוד מלא דברים טובים.
    </Text>
    <View style={styles.mottoContainer}>
      <View style={styles.mottoCard}>
        <Ionicons name="swap-horizontal-outline" size={isMobileWeb ? 24 : 32} color={colors.info} style={styles.mottoIcon} />
        <Text style={styles.mottoText}>{'"לתת זה גם לקבל"'}</Text>
      </View>
      <View style={[styles.mottoCard, { backgroundColor: colors.greenBright + '15', borderColor: colors.greenBright + '40' }]}>
        <Ionicons name="gift-outline" size={isMobileWeb ? 24 : 32} color={colors.greenBright} style={styles.mottoIcon} />
        <Text style={styles.mottoText}>{'"לכל אחד יש משהו שהוא צריך ומשהו שהוא ישמח לתת"'}</Text>
      </View>
    </View>
    <Text style={styles.paragraph}>
      KarmaCommunity היא יותר מרשת חברתית - היא תנועה שמחברת בין אנשים שרוצים לעשות טוב, ללא אינטרסים מסחריים, ללא פרסומות, רק אנושיות וקהילתיות אמיתית.
    </Text>
    <View style={styles.visionHighlights}>
      <View style={styles.visionHighlight}>
        <Ionicons name="heart" size={isMobileWeb ? 20 : 28} color={colors.secondary} />
        <Text style={styles.visionHighlightText}>מוסרי ברמה הגבוהה ביותר</Text>
      </View>
      <View style={styles.visionHighlight}>
        <Ionicons name="code-working" size={isMobileWeb ? 20 : 28} color={colors.info} />
        <Text style={styles.visionHighlightText}>טכנולוגי וחדשני</Text>
      </View>
      <View style={styles.visionHighlight}>
        <Ionicons name="people" size={isMobileWeb ? 20 : 28} color={colors.accent} />
        <Text style={styles.visionHighlightText}>חברתי ומחבר</Text>
      </View>
      <View style={styles.visionHighlight}>
        <Ionicons name="globe" size={isMobileWeb ? 20 : 28} color={colors.greenBright} />
        <Text style={styles.visionHighlightText}>שינוי עולמי אמיתי</Text>
      </View>
    </View>

    {/* CTA Button - Join Us */}
    {/* <View style={styles.ctaRow}>
      <TouchableOpacity
        style={styles.primaryCta}
        onPress={onGoToApp}
        activeOpacity={0.8}
      >
        <Ionicons name="people-outline" size={isMobileWeb ? 16 : 22} color={colors.white} style={styles.ctaIcon} />
        <Text style={styles.primaryCtaText}>הצטרפו אלינו</Text>
      </TouchableOpacity>
    </View> */}
  </Section>
);

