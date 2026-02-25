import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function EducationScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'education',
        icon: 'book-outline',
        color: colors.info,
        bgColor: colors.infoLight,
      }}
    />
  );
}

