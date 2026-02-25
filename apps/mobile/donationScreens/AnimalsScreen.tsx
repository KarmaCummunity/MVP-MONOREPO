import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function AnimalsScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'animals',
        icon: 'paw-outline',
        color: colors.warning,
        bgColor: colors.backgroundTertiary,
      }}
    />
  );
}

