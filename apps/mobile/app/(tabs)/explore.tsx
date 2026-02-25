import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

import colors from '../../globals/colors';
import { FontSizes } from '../../globals/constants';

export default function ExploreScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>חקור את הקהילה</Text>
        <Text style={styles.description}>
          כאן תוכל לחקור את כל האפשרויות שהקהילה מציעה
        </Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>עמותות</Text>
          <Text style={styles.sectionDescription}>
            גלה עמותות מגוונות ותרום לחברה
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>התנדבות</Text>
          <Text style={styles.sectionDescription}>
            מצא הזדמנויות התנדבות בתחומים שונים
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>תרומות</Text>
          <Text style={styles.sectionDescription}>
            תרום כסף, זמן או ידע לטובת הקהילה
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: FontSizes.title,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  section: {
    backgroundColor: colors.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: FontSizes.large,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});