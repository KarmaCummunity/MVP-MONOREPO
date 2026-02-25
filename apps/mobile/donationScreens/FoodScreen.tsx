import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function FoodScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'food',
        icon: 'restaurant-outline',
        color: colors.textPrimary,
        bgColor: colors.backgroundSecondary,
      }}
    />
  );
}

