import React from 'react';
import CategoryScreen from './CategoryScreen';
import colors from '../globals/colors';

export default function JobsScreen() {
  return (
    <CategoryScreen
      config={{
        id: 'jobs',
        icon: 'briefcase-outline',
        color: colors.info,
        bgColor: colors.infoLight,
      }}
    />
  );
}


