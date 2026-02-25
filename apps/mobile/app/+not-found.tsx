import { Link, Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';

export default function NotFoundScreen() {
  const { t } = useTranslation(['common']);
  return (
    <>
      <Stack.Screen options={{ title: t('common:notFound.title') }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t('common:notFound.header')}</Text>
        <Text style={styles.description}>
          {t('common:notFound.description')}
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t('common:notFound.backHome')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: FontSizes.title,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  description: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: FontSizes.body,
    color: colors.info,
    fontWeight: '600',
  },
});