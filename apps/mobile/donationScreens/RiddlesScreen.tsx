import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function RiddlesScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'riddles',
        icon: 'help-circle-outline',
        color: colors.info,
        bgColor: colors.infoLight,
      }}
    />
  );
}

