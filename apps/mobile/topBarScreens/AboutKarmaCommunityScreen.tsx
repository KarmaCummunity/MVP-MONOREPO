// File overview:
// - Purpose: Static About screen describing the Karma Community vision, challenges, model, and contact.
// - Reached from: Top bar (guest mode shortcut) or Settings -> About.
// - Provides: Read-only content, uses `ScreenWrapper`; no route params.
// - External deps: Shared colors, font sizes; localized text currently inline in Hebrew.
import React, { memo } from 'react' // Import memo here
import colors from '../globals/colors'
import { FontSizes } from '../globals/constants';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import ScrollContainer from '../components/ScrollContainer';
import { Ionicons as Icon } from '@expo/vector-icons';
import styles from '../globals/styles';
import ScreenWrapper from '../components/ScreenWrapper';

// Changed this line to use const and wrap with memo
const AboutKarmaCommunityScreen = memo(() => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  return (
    <>
      <ScreenWrapper navigation={navigation} style={localStyles.safeArea}>
        <ScrollContainer style={localStyles.container}>
          {/* Header Section */}
          <Text style={localStyles.mainTitle}>
            אודות קהילת קארמה (Karma Community)
          </Text>
          <Text style={localStyles.subtitle}>הקיבוץ הקפיטליסטי הראשון מסוגו</Text>

          {/* Introduction */}
          <Text style={localStyles.paragraph}>
            קהילת קארמה (KC) מציגה רשת חברתית חדשנית וללא מטרות רווח, המשלבת את
            יעילות הקפיטליזם עם האנושיות שבסוציאליזם. חזוננו הוא ליצור מרחב
            דיגיטלי סוציאליסטי בתוך עולם קפיטליסטי מתקדם, שיעודד עשייה קהילתית
            משותפת ויתרום לשינוי חיובי בעולם.
          </Text>

          {/* What is Karma Community? */}
          <Text style={localStyles.sectionTitle}>מהי קהילת קארמה?</Text>
          <Text style={localStyles.paragraph}>
            קהילת קארמה היא פלטפורמה דיגיטלית נגישה ונוחה שתשמש כחברה שיתופית.
            בפלטפורמה זו, כל אחד יוכל לתת ולקבל - החל מזמן וכסף, דרך אפשרויות
            תחבורה נוספות, ועד לחפצים וידע. ה"פיד" של הרשת החברתית הזו יורכב אך
            ורק מעשייה בקהילה. אנו שואפים לבנות קהילה חדשה ומיוחדת מאפס, ובמקביל
            לאגד קהילות קיימות, גדולות כקטנות, שכבר פועלות רבות למען הקהילה אך
            בנפרד. המוטו שלנו הוא ש"לתת זה גם לקבל".
          </Text>

          {/* Our Aspirations */}
          <Text style={localStyles.sectionTitle}>השאיפות המרכזיות שלנו</Text>
          <Text style={localStyles.paragraph}>
            1. יצירת פלטפורמה דיגיטלית שתאפשר לכל אחד לתת ולקבל בקלות ובנוחות.
          </Text>
          <Text style={localStyles.paragraph}>
            2. בניית קהילה חדשה ומיוחדת שתפעל למען הכלל.
          </Text>
          <Text style={localStyles.paragraph}>
            3. איחוד קהילות קיימות תחת פלטפורמה אחת.
          </Text>
          <Text style={localStyles.paragraph}>
            4. עידוד עשייה חברתית ותרומה לקהילה.
          </Text>

          {/* Existing Challenges */}
          <Text style={localStyles.sectionTitle}>
            האתגרים הקיימים כיום (הבעיות שאנו פותרים)
          </Text>
          <Text style={localStyles.paragraph}>
            כיום, קיימים מספר אתגרים משמעותיים בתחום העשייה הקהילתית וההתנדבותית:
          </Text>
          <View style={localStyles.challengeSection}>
            <Text style={localStyles.challengeTitle}>כפילויות</Text>
            <Text style={localStyles.paragraph}>
              ארגונים רבים בעלי מטרות זהות פועלים בנפרד ואף מתחרים ביניהם, מה
              שמוביל לאיבוד משאבים יקרים.
            </Text>
          </View>
          <View style={localStyles.challengeSection}>
            <Text style={localStyles.challengeTitle}>חוסר אמינות</Text>
            <Text style={localStyles.paragraph}>
              בשל כמות גדולה של ארגונים כפולים והיעדר סטנדרט אחיד בתחום, קל
              לארגונים או אנשים מושחתים לנצל את טוב לבם של התורמים באמצעות
              מניפולציות פשוטות.
            </Text>
          </View>
          <View style={localStyles.challengeSection}>
            <Text style={localStyles.challengeTitle}>פיזור</Text>
            <Text style={localStyles.paragraph}>
              מגוון האפשרויות הרחב הקיים עבור האזרח הפשוט לתרום לקהילה יצר מצב של
              ארגונים רבים ונפרדים, שכל אחד מהם מנגיש שירות אחר. מצב זה מונע
              מהתורם לקבל תמונה רחבה ולהבין את כל האפשרויות העומדות בפניו. בנוסף,
              פיזור זה מונע היווצרות של קהילה גדולה ומאוחדת העוסקת כולה בנתינה,
              שיכולה לשנות את כללי המשחק.
            </Text>
          </View>

          {/* Vision and Solutions */}
          <Text style={localStyles.sectionTitle}>החזון והפתרונות שאנו מציעים</Text>
          <View style={localStyles.solutionSection}>
            <Text style={localStyles.solutionTitle}>אמינות</Text>
            <Text style={localStyles.paragraph}>
              באמצעות אפליקציה נוחה ושקופה לחלוטין, אנו נאיר על עולם שלם המצוי
              בשוליים החברתיים, ונספק לתורם את האמינות הנדרשת.
            </Text>
          </View>
          <View style={localStyles.solutionSection}>
            <Text style={localStyles.solutionTitle}>איחוד</Text>
            <Text style={localStyles.paragraph}>
              פלטפורמה אחודה ויחידה שתכלול את כל סוגי הנתינה האפשריים תאפשר לנו
              לחסוך ולייעל את כל תהליך הנתינה, ובכך לתרום יותר.
            </Text>
          </View>
          <View style={localStyles.solutionSection}>
            <Text style={localStyles.solutionTitle}>קהילה</Text>
            <Text style={localStyles.paragraph}>
              יצירת קהילה חזקה ומגובשת בתוך הפלטפורמה תאפשר לנו להגשים את הרעיון
              האוטופי של חיים קיבוציים בעולם קפיטליסטי מתקדם.
            </Text>
          </View>

          {/* Why Now? */}
          <Text style={localStyles.sectionTitle}>
            מדוע דווקא עכשיו? מיצוי הרשתות החברתיות וחוסר קהילתיות
          </Text>
          <Text style={localStyles.paragraph}>
            כבר שנים שיש לאדם את הדיסוננס בין הרצון לקהילה והרצון לחופשיות, הרי כל
            קהילה עם הגבלות ומוסכמות משלה.
          </Text>
          <Text style={localStyles.paragraph}>
            דווקא בעידן של רשתות חברתיות המונעות מאינטרסים של כסף ופרסומות, אנו
            רואים את הפוטנציאל והצורך האמיתי שיש לנו כבני אדם ב"רשתות" האלה.
          </Text>
          <Text style={localStyles.paragraph}>
            KC באה להציע רשת חברתית ללא פרסומות וללא תוכן חומרי/פוגעני. פלטפורמה
            המקדשת קהילתיות ושיתוף. KC באה להציע פלטפורמה, מין רשת חברתית, אשר מצד
            אחד שמה דגש על ביחד ומצד שני דגש על חופש וליברליות.
          </Text>

          {/* Economic Model */}
          <Text style={localStyles.sectionTitle}>מודל כלכלי</Text>
          <View style={localStyles.bulletPointContainer}>
            <Text style={localStyles.bulletPoint}>•</Text>
            <Text style={localStyles.bulletText}>
              תרומות ישירות: כמו כל עמותה, נוכל לקבל תרומות ישירות. מכסף ורהיטים,
              ועד ייעוץ ארגוני ועסקי.
            </Text>
          </View>
          <View style={localStyles.bulletPointContainer}>
            <Text style={localStyles.bulletPoint}>•</Text>
            <Text style={localStyles.bulletText}>
              עמלת פלטפורמה: כמו כל פלטפורמה שנותנת שירותים, ושרותי העברת כספים
              בפרט, נוכל לקחת עמלה על העברות כספים דרכנו.
            </Text>
          </View>
          <View style={localStyles.bulletPointContainer}>
            <Text style={localStyles.bulletPoint}>•</Text>
            <Text style={localStyles.bulletText}>
              תשלום מהעמותות: כמו כל פלטפורמה שנותנת שירות, נוכל לקחת תשלום חודשי
              סמלי מהעמותות, אשר בזכות הפלטפורמה יקבלו חשיפה גדולה יותר.
            </Text>
          </View>
          <View style={localStyles.bulletPointContainer}>
            <Text style={localStyles.bulletPoint}>•</Text>
            <Text style={localStyles.bulletText}>
              "מניות": גורמים בעלי השפעה יהיו מעוניינים בהשפעה רחבה שתוחזר. עם
              זאת, נשאיר את רוב השליטה בידי העמותה.
            </Text>
          </View>

          {/* Development Model */}
          <Text style={localStyles.sectionTitle}>מודל פיתוח</Text>
          <Text style={localStyles.paragraph}>
            לנוכח אופי הפרויקט עיצבנו מודל פיתוח אשר יוכל להבטיח איכות בעלויות
            נמוכות.
          </Text>
          <View style={localStyles.bulletPointContainer}>
            <Text style={localStyles.bulletPoint}>•</Text>
            <Text style={localStyles.bulletText}>
              צוות קטן ומקצועי: צוות מצומצם של עובדים שיהיו "מנהלי הפרויקט" אשר
              ינהלו את התהליך, יובילו ויכוונו את מערך המתנדבים המבוזר.
            </Text>
          </View>
          <View style={localStyles.bulletPointContainer}>
            <Text style={localStyles.bulletPoint}>•</Text>
            <Text style={localStyles.bulletText}>
              פיתוח בעזרת מתנדבים: בעזרת גל גדול של מתכנתים בתעשייה אשר משמיעים
              קולות של חוסר משמעות במשרתם הנוכחית, בנוסף לכמות גדולה של סטודנטים
              ומתכנתים אחרים שישמחו לתת יד בפרויקט כזה, זיהינו את הפוטנציאל שיש
              במערך מבוזר שכזה.
            </Text>
          </View>
          <Text style={localStyles.paragraph}>
            בעזרת צוות קטן ומקצועי נוכל לנהל כמות גדולה של מתכנתים בעלויות נמוכות
            מאוד עד אפסיות, ובכך לנצל את המשאבים ולהאיץ את הפיתוח.
          </Text>

          {/* Initial Steps */}
          <Text style={localStyles.sectionTitle}>שלבים ראשונים</Text>
          <View style={localStyles.bulletPointContainer}>
            <Text style={localStyles.bulletPoint}>•</Text>
            <Text style={localStyles.bulletText}>הגדלת הקהילה</Text>
          </View>
          <View style={localStyles.bulletPointContainer}>
            <Text style={localStyles.bulletPoint}>•</Text>
            <Text style={localStyles.bulletText}>משקיע ראשוני</Text>
          </View>
          <View style={localStyles.bulletPointContainer}>
            <Text style={localStyles.bulletPoint}>•</Text>
            <Text style={localStyles.bulletText}>אפיון</Text>
          </View>
          <View style={localStyles.bulletPointContainer}>
            <Text style={localStyles.bulletPoint}>•</Text>
            <Text style={localStyles.bulletText}>עיצוב</Text>
          </View>
          <View style={localStyles.bulletPointContainer}>
            <Text style={localStyles.bulletPoint}>•</Text>
            <Text style={localStyles.bulletText}>MVP (Minimum Viable Product)</Text>
          </View>

          {/* Regulations for Organizations */}
          <Text style={localStyles.sectionTitle}>תקנון ביחס לארגונים שנצרף</Text>
          <View style={localStyles.bulletPointContainer}>
            <Text style={localStyles.bulletPoint}>•</Text>
            <Text style={localStyles.bulletText}>
              פוליטיקה ואידיאולוגיה - ארגון אינו רשאי להיות פוליטי ולפעול לצורך
              קידום אידיאולוגיה או לשון הרע לכל קבוצה או אדם פרטי.
            </Text>
          </View>
          <View style={localStyles.bulletPointContainer}>
            <Text style={localStyles.bulletPoint}>•</Text>
            <Text style={localStyles.bulletText}>
              אלימות והפרת זכויות האדם - הארגון אינו רשאי לקדם או לתמוך באלימות,
              פשיזם, נאציזם, או כל סוג של הפרת זכויות האדם.
            </Text>
          </View>
          <View style={localStyles.bulletPointContainer}>
            <Text style={localStyles.bulletPoint}>•</Text>
            <Text style={localStyles.bulletText}>
              דת - הארגון אינו רשאי לקדם או להפיץ את דעותיו הדתיות באופן שיידחה
              קבוצה או אדם פרטי.
            </Text>
          </View>
          <View style={localStyles.bulletPointContainer}>
            <Text style={localStyles.bulletPoint}>•</Text>
            <Text style={localStyles.bulletText}>
              פרסום שקרי או מזיק - הארגון אינו רשאי לפרסם מידע שקרי או מזיק שיכול
              לגרום נזק לציבור הרחב או לאדם פרטי.
            </Text>
          </View>
          <View style={localStyles.bulletPointContainer}>
            <Text style={localStyles.bulletPoint}>•</Text>
            <Text style={localStyles.bulletText}>
              ארגונים מסוכנים - הארגון אינו רשאי לקיים קשרים עם קבוצות המוכרות
              כמסוכנות.
            </Text>
          </View>
          <View style={localStyles.bulletPointContainer}>
            <Text style={localStyles.bulletPoint}>•</Text>
            <Text style={localStyles.bulletText}>
              ניהול כספי נאות - הארגון חייב לנהוג כראוי בנושא ניהול הכספים ולא
              לעשות שימוש לא ראוי בכספי הארגון למטרות אישיות.
            </Text>
          </View>
          <Text style={localStyles.paragraph}>
            אנו שומרים לעצמנו את הזכות לסרב להצטרפות או להמשיך שיתוף פעולה עם כל
            עמותה או ארגון שיזדהה עם כל אחת מהתנאים המפורטים לעיל, לפי שיקול דעתנו
            הבלעדי.
          </Text>

          {/* Call to Action */}
          <Text style={localStyles.sectionTitle}>מחפשים אתכם</Text>
          <Text style={localStyles.paragraph}>
            הפרויקט ממש בתחילת דרכו, ולכן כל עזרה, ייעוץ ואפילו ביקורת, מקדם
            ומשפיע.
          </Text>
          <Text style={localStyles.paragraph}>כל עזרה משמעותית.</Text>
          <Text style={localStyles.paragraph}>כי לתת זה גם לקבל. זאת לא קלישאה.</Text>

          {/* Team Members - General Section */}
          <Text style={localStyles.sectionTitle}>הצוות שלנו</Text>
          <Text style={localStyles.paragraph}>
            קהילת קארמה מורכבת מצוות מסור ומקצועי של יזמים, מתכנתים, מעצבים
            ויועצים, הפועלים יחד מתוך אמונה עמוקה בחזון הפרויקט. אנו משלבים ידע
            וניסיון ממגוון תחומים כדי לבנות פלטפורמה חזקה ויציבה, הממוקדת בצרכי
            הקהילה. הצוות שלנו מחויב להצלחת הפרויקט ולקידום ערכי הנתינה
            והשיתופיות, והוא פועל בשקיפות מלאה ובשיתוף פעולה עם המתנדבים הרבים
            שמצטרפים לדרך.
          </Text>

          {/* Contact Information (Optional - you might prefer a separate screen) */}
          <Text style={localStyles.sectionTitle}>צרו קשר</Text>
          <Text style={localStyles.paragraph}>
            לכל שאלה, רעיון או שיתוף פעולה, אל תהססו ליצור קשר. אנו נשמח לשמוע
            מכם!
          </Text>
          <View style={localStyles.contactInfo}>
            <Text style={localStyles.contactText}>
              מייל כללי: info@karmacommunity.org
            </Text>
            <Text style={localStyles.contactText}>טלפון: 123-456-7890</Text>
            <Text style={localStyles.contactText}>
              כתובת: רחוב הדוגמה 1, עיר הדוגמה
            </Text>
          </View>
        </ScrollContainer>
      </ScreenWrapper>
    </>
  )
}); // Closing memo parenthesis and semicolon

AboutKarmaCommunityScreen.displayName = 'AboutKarmaCommunityScreen';

export default AboutKarmaCommunityScreen; // Export the const component

const localStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    marginTop: Platform.OS === 'android' ? 30 : 0,
    backgroundColor: colors.backgroundSecondary
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  headerTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    flex: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: colors.backgroundSecondary,
  },
  mainTitle: {
    fontSize: FontSizes.heading1,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: colors.textPrimary
  },
  subtitle: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: colors.textSecondary
  },
  sectionTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 25,
    marginBottom: 15,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 5
  },
  paragraph: {
    fontSize: FontSizes.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 15,
    color: colors.textPrimary
  },
  bulletPointContainer: {
    flexDirection: 'row-reverse',
    marginBottom: 8
  },
  bulletPoint: {
    fontSize: FontSizes.body,
    fontWeight: 'bold',
    marginRight: 5,
    color: colors.textPrimary // Using textPrimary
  },
  bulletText: {
    flex: 1,
    fontSize: FontSizes.body,
    textAlign: 'center',
    lineHeight: 24,
    color: colors.textPrimary // Using textPrimary
  },
  challengeSection: {
    marginBottom: 20,
    paddingRight: 10,
    borderRightWidth: 3,
    borderRightColor: colors.error // Using error for challenges
  },
  challengeTitle: {
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 8,
    color: colors.error // Using error for challenges
  },
  solutionSection: {
    marginBottom: 20,
    paddingRight: 10,
    borderRightWidth: 3,
    borderRightColor: colors.accent // Using accent for solutions (green)
  },
  solutionTitle: {
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 8,
    color: colors.accent // Using accent for solutions
  },
  contactInfo: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: colors.white, // Using white
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border // Using border color
  },
  contactText: {
    fontSize: FontSizes.body,
    textAlign: 'right',
    lineHeight: 22,
    color: colors.textPrimary // Using textPrimary
  },
})