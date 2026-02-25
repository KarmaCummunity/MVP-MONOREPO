import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function EnvironmentScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'environment',
        icon: 'leaf-outline',
        color: colors.success,
        bgColor: colors.successLight,
      }}
    />
  );
}

