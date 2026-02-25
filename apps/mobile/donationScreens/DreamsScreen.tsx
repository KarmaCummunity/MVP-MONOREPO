import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function DreamsScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'dreams',
        icon: 'star-outline',
        color: colors.secondary,
        bgColor: colors.pinkLight,
      }}
    />
  );
}


