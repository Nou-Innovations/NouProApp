import { ViewStyle } from 'react-native';

export interface HeaderProps {
  variant: 'leftTitleHeader' | 'middleTitleHeader';
  leftIconName?: string;
  rightIconName?: string;
  style?: ViewStyle;
} 