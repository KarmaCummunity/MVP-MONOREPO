import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function MusicScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'music',
        icon: 'musical-notes-outline',
        color: colors.secondary,
        bgColor: colors.pinkLight,
      }}
    />
  );
}

