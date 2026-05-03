import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import colors from '../../globals/colors';

export type IonIconName = ComponentProps<typeof Ionicons>['name'];

type StatGridItemProps = {
  icon: IonIconName;
  value: string;
  label: string;
  color?: string;
  accentBar?: string;
  iconSize: number;
  styles: {
    statCardOuter: object;
    statAccentBar: object;
    statItem: object;
    statIconWrap: object;
    statValue: object;
    statLabel: object;
  };
};

export const StatGridItem: React.FC<StatGridItemProps> = ({
  icon,
  value,
  label,
  color = colors.info,
  accentBar,
  iconSize,
  styles: s,
}) => (
  <View style={s.statCardOuter}>
    {accentBar ? <View style={[s.statAccentBar, { backgroundColor: accentBar }]} /> : null}
    <View style={s.statItem}>
      <View style={[s.statIconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={iconSize} color={color} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel} numberOfLines={3}>
        {label}
      </Text>
    </View>
  </View>
);

type PostMetricCellProps = {
  value: string;
  label: string;
  styles: {
    postMini: object;
    postMiniValue: object;
    postMiniLabel: object;
  };
};

export const PostMetricCell: React.FC<PostMetricCellProps> = ({ value, label, styles: s }) => (
  <View style={s.postMini}>
    <Text style={s.postMiniValue}>{value}</Text>
    <Text style={s.postMiniLabel} numberOfLines={2}>
      {label}
    </Text>
  </View>
);
