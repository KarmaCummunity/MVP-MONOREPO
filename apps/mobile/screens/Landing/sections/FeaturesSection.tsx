import React from 'react';
import { View } from 'react-native';
import { Feature, Section } from '../components';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';

export const FeaturesSection = () => (
  <Section id="section-features" title="כל מה שצריך כדי לעשות טוב" subtitle="כלים פשוטים שהופכים עזרה הדדית לחלק מהיום-יום" style={styles.sectionAltBackground}>
    <View style={styles.featuresGrid}>
      <Feature emoji="🤝" title="צריכים עזרה? רוצים לעזור?" text="פרסמו בקלות בקשה או הצעה, וקבלו מענה מהקהילה סביבכם. משיעורי עזר ועד תיקונים קטנים בבית." />
      <Feature emoji="💬" title="התחברו לאנשים כמוכם" text="מצאו קבוצות עניין, הצטרפו לדיונים, וצרו קשרים חדשים עם אנשים שאכפת להם." />
      <Feature emoji="📍" title="גלו הזדמנויות סביבכם" text="המפה החכמה שלנו תראה לכם איפה צריכים אתכם, ממש ליד הבית." greenAccent />
      <Feature emoji="🔒" title="פלטפורמה בטוחה ושקופה" text="בלי פרסומות, בלי תוכן פוגעני, רק קהילתיות אמיתית ואמון הדדי." />
    </View>
  </Section>
);

