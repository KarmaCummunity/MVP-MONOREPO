import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function MedicalScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'medical',
        icon: 'medical-outline',
        color: colors.error,
        bgColor: colors.errorLight,
      }}
    />
  );
}

