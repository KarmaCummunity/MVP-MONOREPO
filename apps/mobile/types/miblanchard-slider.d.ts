declare module '@miblanchard/react-native-slider' {
  import * as React from 'react';
  import { ViewStyle } from 'react-native';

  export interface SliderProps {
    value?: number | number[];
    onValueChange?: (value: number | number[]) => void;
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
    minimumTrackTintColor?: string;
    maximumTrackTintColor?: string;
    trackStyle?: ViewStyle | ViewStyle[];
    containerStyle?: ViewStyle | ViewStyle[];
    thumbStyle?: ViewStyle | ViewStyle[];
    renderThumbComponent?: () => React.ReactNode;
    trackClickable?: boolean;
  }

  export class Slider extends React.PureComponent<SliderProps> {}
}

