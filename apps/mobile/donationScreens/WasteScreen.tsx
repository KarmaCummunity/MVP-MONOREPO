import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function WasteScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'waste',
        icon: 'trash-outline',
        color: colors.warning,
        bgColor: colors.warningLight,
      }}
    />
  );
}

