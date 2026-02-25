import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';
import { useTranslation } from 'react-i18next';

export default function SportsScreen() {
  const { t } = useTranslation(['donations']);
  return (
    <CategoryScreen
      config={{
        id: 'sports',
        title: t('donations:categories.sports.title'),
        subtitle: t('donations:categories.sports.subtitle'),
        icon: 'football-outline',
        color: colors.accent,
        bgColor: colors.warningLight,
        description: t('donations:categories.sports.description'),
      }}
    />
  );
}

