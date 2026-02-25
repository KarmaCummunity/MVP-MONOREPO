import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function GamesScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'games',
        icon: 'game-controller-outline',
        color: colors.accent,
        bgColor: colors.warningLight,
      }}
    />
  );
}

