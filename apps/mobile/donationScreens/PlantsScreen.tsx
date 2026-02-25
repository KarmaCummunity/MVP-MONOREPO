import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function PlantsScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'plants',
        icon: 'flower-outline',
        color: colors.success,
        bgColor: colors.successLight,
      }}
    />
  );
}

