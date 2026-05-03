import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../globals/colors';
import { FontSizes } from '../../globals/constants';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function OrgDashboardScreen() {
  return (
    <ScreenWrapper style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Organization Dashboard</Text>
        <Text style={styles.subtitle}>Coming Soon</Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: FontSizes.heading1,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
  },
});
