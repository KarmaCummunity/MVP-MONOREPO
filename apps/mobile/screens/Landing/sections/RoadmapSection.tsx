import React from 'react';
import { Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../globals/colors';
import { Section } from '../components';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import { IS_MOBILE_WEB as isMobileWeb } from '../constants';

export const RoadmapSection = () => {
  const roadmapSteps = [
    {
      time: 'Q1 2026',
      label: 'הוצאת גרסה ראשונה לאפלקציה לandroid וios',
      icon: 'phone-portrait-outline',
      color: colors.info
    },
    {
      time: 'Q2 2026',
      label: 'פיצירים מתקדמים לשיתוף מידע עם שאר העמותות וקבוצות הוואטספ והפייסבוק',
      icon: 'share-social-outline',
      color: colors.secondary
    },
    {
      time: 'Q3 2026',
      label: 'שיתופי פעולה עם עיריות וגורמי רווחה',
      icon: 'business-outline',
      color: colors.accent
    },
    {
      time: 'Q4 2026',
      label: 'יציאה לחו״ל כפלטפורמה בינלאומית',
      icon: 'globe-outline',
      color: colors.success
    },
  ];

  const logoEvolution = [
    { image: require('../../../assets/images/landingScreen/kc_log_evo/logo-0.jpeg'), label: 'התחלה' },
    { image: require('../../../assets/images/landingScreen/kc_log_evo/logo-1.jpeg'), label: 'פיתוח' },
    { image: require('../../../assets/images/landingScreen/kc_log_evo/logo-2.jpeg'), label: 'שיפור' },
    { image: require('../../../assets/images/landingScreen/kc_log_evo/logo-3.jpeg'), label: 'עדכון' },
    { image: require('../../../assets/images/landingScreen/kc_log_evo/logo-4.png'), label: 'עכשיו' },
  ];

  return (
    <Section id="section-roadmap" title="מפת הדרכים שלנו" subtitle="התוכנית להרחבת האימפקט של הקהילה">
      <View style={styles.roadmapContainer}>
        {roadmapSteps.map((step, index) => (
          <View key={step.label} style={styles.roadmapItemWrapper}>
            <View style={styles.roadmapItem}>
              <View style={[styles.roadmapIconContainer, { backgroundColor: step.color + '15' }]}>
                <Ionicons
                  name={step.icon as any}
                  size={isMobileWeb ? 24 : 32}
                  color={step.color}
                />
              </View>
              <View style={styles.roadmapContent}>
                <View style={[styles.roadmapTimeBadge, { backgroundColor: step.color }]}>
                  <Text style={styles.roadmapTimeText}>{step.time}</Text>
                </View>
                <Text style={styles.roadmapLabel}>{step.label}</Text>
              </View>
            </View>
            {index < roadmapSteps.length - 1 && (
              <View style={styles.roadmapConnector}>
                <View style={[styles.roadmapConnectorLine, { borderColor: step.color + '40' }]} />
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Logo Evolution Section */}
      <View style={styles.logoEvolutionContainer}>
        <Text style={styles.logoEvolutionTitle}>איך הדברים מתפתחים</Text>
        <Text style={styles.logoEvolutionSubtitle}>הלוגו שלנו עבר כמה גרסאות בדרך לכאן</Text>
        <View style={styles.logoEvolutionGrid}>
          {logoEvolution.map((logo, index) => (
            <View key={index} style={styles.logoEvolutionItem}>
              <Image source={logo.image} style={styles.logoEvolutionImage} resizeMode="contain" />
              <Text style={styles.logoEvolutionLabel}>{logo.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.brandStrip}>
        <Ionicons name="rocket-outline" size={isMobileWeb ? 18 : 24} color={colors.info} />
        <Text style={styles.trustText}>מתקדמים יחד עם הקהילה – כל פידבק משפיע על סדר העדיפויות שלנו.</Text>
      </View>
    </Section>
  );
};

