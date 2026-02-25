import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function BooksScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'books',
        icon: 'library-outline',
        color: colors.success,
        bgColor: colors.successLight,
      }}
    />
  );
}

