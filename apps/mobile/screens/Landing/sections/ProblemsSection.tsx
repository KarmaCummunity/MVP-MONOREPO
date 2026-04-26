import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../globals/colors';
import { Section } from '../components';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import { IS_MOBILE_WEB as isMobileWeb } from '../constants';

export const ProblemsSection = () => (
  <Section id="section-problems" title="הבעיות שאנחנו באים לפתור" subtitle="למה צריך בכלל את KC?">
    <View style={styles.problemsContent}>
      <View style={styles.problemCard}>
        <Ionicons name="copy-outline" size={isMobileWeb ? 24 : 32} color={colors.accent} style={styles.problemIcon} />
        <Text style={styles.problemTitle}>כפילות, פיזור וחוסר אמינות</Text>
        <Text style={styles.problemText}>
          היום יש כל כך הרבה פלטפורמות, קבוצות וואטסאפ, ועמותות שמנסות לעזור. כל אחד עובד לבד, יש כפילויות, חוסר תיאום, וקשה לדעת על מי אפשר לסמוך.
          Karma Community מאחדת את כל זה למקום אחד, שקוף ואמין.
        </Text>
      </View>

      <View style={styles.problemCard}>
        <Ionicons name="people-circle-outline" size={isMobileWeb ? 24 : 32} color={colors.info} style={styles.problemIcon} />
        <Text style={styles.problemTitle}>הדיסוננס בין קהילה לחופשיות</Text>
        <Text style={styles.problemText}>
          כבר שנים שיש לאדם את הדיסוננס בין הרצון לקהילה והרצון לחופשיות. הרי כל קהילה עם הגבלות ומוסכמות משלה.
          {'\n\n'}
          Karma Community באה להציע פלטפורמה, מין רשת חברתית, אשר מצד אחד שמה דגש על ביחד ומצד שני דגש על חופש וליברליות.
        </Text>
      </View>

      <View style={styles.problemCard}>
        <Ionicons name="ban-outline" size={isMobileWeb ? 24 : 32} color={colors.secondary} style={styles.problemIcon} />
        <Text style={styles.problemTitle}>רשתות חברתיות מונעות מאינטרסים</Text>
        <Text style={styles.problemText}>
          דווקא בעידן של רשתות חברתיות המונעות מאינטרסים של כסף ופרסומות, אנחנו רואים את הפוטנציאל והצורך האמיתי שיש לנו כבני אדם ב{'"'}רשתות{'"'} האלה.
          {'\n\n'}
          Karma Community באה להציע רשת חברתית ללא פרסומות וללא תוכן חומרי/פוגעני. פלטפורמה המקדשת קהילתיות ושיתוף.
        </Text>
      </View>
    </View>
  </Section>
);

