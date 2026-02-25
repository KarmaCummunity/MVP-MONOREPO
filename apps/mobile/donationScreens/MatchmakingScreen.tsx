import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function MatchmakingScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'matchmaking',
        icon: 'people-outline',
        color: colors.secondary,
        bgColor: colors.pinkLight,
      }}
    />
  );
}


