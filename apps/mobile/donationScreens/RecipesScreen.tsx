import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function RecipesScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'recipes',
        icon: 'fast-food-outline',
        color: colors.success,
        bgColor: colors.successLight,
      }}
    />
  );
}

