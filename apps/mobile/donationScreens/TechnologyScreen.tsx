import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function TechnologyScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'technology',
        icon: 'laptop-outline',
        color: colors.info,
        bgColor: colors.infoLight,
      }}
    />
  );
}

