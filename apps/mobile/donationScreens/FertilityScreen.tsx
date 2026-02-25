import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function FertilityScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'fertility',
        icon: 'medkit-outline',
        color: colors.error,
        bgColor: colors.errorLight,
      }}
    />
  );
}


