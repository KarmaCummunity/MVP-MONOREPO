import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function HousingScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'housing',
        icon: 'home-outline',
        color: colors.info,
        bgColor: colors.infoLight,
      }}
    />
  );
}

