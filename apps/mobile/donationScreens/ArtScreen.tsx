import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function ArtScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'art',
        icon: 'color-palette-outline',
        color: colors.secondary,
        bgColor: colors.pinkLight,
      }}
    />
  );
}

