import React, { useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../globals/colors';
import { Section } from '../components';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import { IS_MOBILE_WEB as isMobileWeb } from '../constants';

const FAQItem: React.FC<{ question: string; answer: string; icon?: string }> = ({ question, answer, icon }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const animatedRotation = useRef(new Animated.Value(0)).current;

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(animatedRotation, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    setIsExpanded(!isExpanded);
  };

  const contentHeight = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200], // Max height for answer
  });

  const rotateInterpolate = animatedRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.faqCard}>
      <TouchableOpacity
        style={styles.faqQuestionRow}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.faqQuestionContent}>
          {icon && (
            <Ionicons
              name={icon as any}
              size={isMobileWeb ? 20 : 24}
              color={colors.info}
              style={styles.faqIcon}
            />
          )}
          <Text style={styles.faqQ}>{question}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons
            name="chevron-down-outline"
            size={isMobileWeb ? 20 : 24}
            color={colors.info}
          />
        </Animated.View>
      </TouchableOpacity>
      <Animated.View style={[styles.faqAnswerContainer, { maxHeight: contentHeight, opacity: animatedHeight }]}>
        <Text style={styles.faqA}>{answer}</Text>
      </Animated.View>
    </View>
  );
};

export const FAQSection = () => {
  const faqData = [
    {
      question: 'האם השימוש באפליקציה עולה כסף?',
      answer: 'לא. קהילת קארמה היא מיזם ללא מטרות רווח, והשימוש בה יהיה תמיד בחינם, לכולם. אנחנו מאמינים שעזרה הדדית צריכה להיות נגישה לכולם, ללא כל עלות.',
      icon: 'cash-outline',
    },
    {
      question: 'איך אפשר לתרום או להתנדב?',
      answer: 'הדרך הטובה ביותר היא להוריד את האפליקציה, להצטרף לקהילה ולהתחיל להגיב לבקשות שעולות. בנוסף, תמיד אפשר ליצור איתנו קשר ישירות דרך ווטסאפ, מייל או לקבוצת הווטסאפ שלנו. כל עזרה מוערכת!',
      icon: 'heart-outline',
    },
    {
      question: 'האם האפליקציה זמינה גם לאנדרואיד וגם ל-iOS?',
      answer: 'האפליקציה נמצאת כרגע בתהליך בנייה. בינתיים, יש לנו אתר Web זמין לשימוש שניתן לגשת אליו מכל דפדפן, גם הוא בתהליך בנייה והתפתחות מתמשכת. אנו עובדים על גרסאות לאנדרואיד ו-iOS שיושקו בעתיד.',
      icon: 'phone-portrait-outline',
    },
    {
      question: 'האם יש פרסומות?',
      answer: 'ממש לא. הפלטפורמה נקייה לחלוטין מפרסומות ומקדשת תוכן קהילתי בלבד. אנחנו מחויבים לשמור על חוויית משתמש נקייה וממוקדת בקהילה, ללא הסחות דעת מסחריות.',
      icon: 'ban-outline',
    },
    {
      question: 'איך מתחילים להשתמש באפליקציה?',
      answer: 'פשוט מאוד! הורידו את האפליקציה, הירשמו עם כמה פרטים בסיסיים (או השתמשו במצב אורח), ומיד תוכלו להתחיל לפרסם בקשות או הצעות, או לדפדף ולגלות מה קורה בקהילה סביבכם.',
      icon: 'play-circle-outline',
    },
    {
      question: 'מה זה אומר "קיבוץ דיגיטלי"?',
      answer: 'זה החזון שלנו - ליצור קהילה דיגיטלית שמתפקדת כמו קיבוץ: שיתוף, עזרה הדדית, אחריות משותפת, אבל בעולם המודרני והדיגיטלי. כל אחד יכול לתת וכל אחד יכול לקבל, בלי בירוקרטיה ובלי עמלות.',
      icon: 'people-circle-outline',
    },
    {
      question: 'איך אתם מבטיחים אבטחה ופרטיות?',
      answer: 'אנחנו לוקחים את האבטחה והפרטיות ברצינות רבה. כל המידע מוצפן, אנחנו לא משתפים מידע עם צדדים שלישיים, ויש לנו מערכת אימות משתמשים. בנוסף, כל המשתמשים יכולים לשלוט בפרטיות שלהם ולהחליט מה לחשוף.',
      icon: 'shield-checkmark-outline',
    },
    {
      question: 'מה ההבדל בין Karma Community לבין פלטפורמות אחרות?',
      answer: 'ההבדל העיקרי הוא שאנחנו ללא מטרות רווח, ללא פרסומות, וממוקדים 100% בקהילה ובעזרה הדדית. אנחנו לא מוכרים מידע, לא מנסים להרוויח כסף מהמשתמשים, וכל מה שאנחנו עושים הוא למען הקהילה.',
      icon: 'star-outline',
    },
    {
      question: 'איך אפשר לעזור בפיתוח האפליקציה?',
      answer: 'אנחנו תמיד שמחים לעזרה! אפשר לעזור בקוד (הכל פתוח בגיטהאב), בעיצוב, בתוכן, בבדיקות, או פשוט להיות חלק מהקהילה ולשתף פידבק. צרו איתנו קשר דרך ווטסאפ או מייל ונשמח לספר לכם איך אפשר לעזור.',
      icon: 'code-working-outline',
    },
    {
      question: 'מה קורה אם יש בעיה טכנית?',
      answer: 'אם נתקלתם בבעיה טכנית, אנחנו כאן לעזור! צרו איתנו קשר דרך ווטסאפ, מייל, או דרך קבוצת הווטסאפ שלנו. נשתדל לענות מהר ככל האפשר ולפתור את הבעיה. הפידבק שלכם חשוב לנו מאוד!',
      icon: 'help-circle-outline',
    },
  ];

  return (
    <Section id="section-faq" title="שאלות ותשובות" subtitle="כל מה שרציתם לדעת על Karma Community">
      <View style={styles.faqContainer}>
        {faqData.map((item, index) => (
          <FAQItem
            key={index}
            question={item.question}
            answer={item.answer}
            icon={item.icon}
          />
        ))}
      </View>
    </Section>
  );
};

