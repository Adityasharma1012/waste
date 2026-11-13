import { Platform } from 'react-native';

export const MIN_TOUCH_TARGET = 44;

export interface AppTheme {
  isDark: boolean;
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  primarySoft: string;
  danger: string;
  dangerSoft: string;
  dangerText: string;
  warning: string;
  warningSoft: string;
  warningText: string;
  amber: string;
  amberSoft: string;
  amberText: string;
  success: string;
  successSoft: string;
  successText: string;
  info: string;
  infoSoft: string;
  infoText: string;
}

export const LIGHT_THEME: AppTheme = {
  isDark: false,
  bg: '#F4F7F4',
  surface: '#FFFFFF',
  surfaceElevated: '#EAF1EB',
  border: '#C9D6CB',
  text: '#102116',
  textMuted: '#465B4D',
  primary: '#166534',
  primaryText: '#FFFFFF',
  primarySoft: '#DCFCE7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  dangerText: '#7F1D1D',
  warning: '#C2410C',
  warningSoft: '#FFEDD5',
  warningText: '#7C2D12',
  amber: '#A16207',
  amberSoft: '#FEF3C7',
  amberText: '#713F12',
  success: '#15803D',
  successSoft: '#DCFCE7',
  successText: '#14532D',
  info: '#1D4ED8',
  infoSoft: '#DBEAFE',
  infoText: '#1E3A8A',
};

export const DARK_THEME: AppTheme = {
  isDark: true,
  bg: '#0C1410',
  surface: '#15221B',
  surfaceElevated: '#1D2F26',
  border: '#2F483A',
  text: '#F1F8F3',
  textMuted: '#A8BFB0',
  primary: '#22C55E',
  primaryText: '#062812',
  primarySoft: '#133A22',
  danger: '#F87171',
  dangerSoft: '#451A1A',
  dangerText: '#FECACA',
  warning: '#FB923C',
  warningSoft: '#431F0B',
  warningText: '#FED7AA',
  amber: '#FACC15',
  amberSoft: '#3D2F0A',
  amberText: '#FEF08A',
  success: '#4ADE80',
  successSoft: '#123821',
  successText: '#BBF7D0',
  info: '#60A5FA',
  infoSoft: '#172554',
  infoText: '#BFDBFE',
};

export const FONT_MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});
