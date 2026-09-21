/** PayPace HUD palette — industrial resource management */
export const colors = {
  bg: '#0B0D0C',
  panel: '#151917',
  panelAlt: '#202622',
  border: '#2A312C',
  borderSoft: '#1C221E',

  resource: '#7DFF56',
  healthy: '#52D273',
  warning: '#F2B544',
  danger: '#E85A3F',
  critical: '#D92525',

  text: '#F0F2EA',
  textSecondary: '#9A9F98',
  textDim: '#6B716C',

  // legacy aliases used by older screens during migration
  bgTop: '#0B0D0C',
  bgMid: '#0B0D0C',
  bgBottom: '#0B0D0C',
  ink: '#F0F2EA',
  inkSecondary: '#9A9F98',
  accent: '#7DFF56',
  accentMid: '#52D273',
  accentLight: '#52D273',
  mint: '#202622',
  accentSoft: 'rgba(125, 255, 86, 0.12)',
  warm: '#F2B544',
  success: '#52D273',
  whiteSoft: '#151917',
  whiteSofter: '#202622',
};

export const spacing = {
  screen: 20,
};

export type ResourceTone = 'healthy' | 'warning' | 'danger' | 'critical' | 'empty';

export function toneForRatio(remainingRatio: number): ResourceTone {
  if (remainingRatio <= 0) return 'critical';
  if (remainingRatio < 0.15) return 'danger';
  if (remainingRatio < 0.35) return 'warning';
  return 'healthy';
}

export function colorForTone(tone: ResourceTone): string {
  switch (tone) {
    case 'healthy':
      return colors.resource;
    case 'warning':
      return colors.warning;
    case 'danger':
      return colors.danger;
    case 'critical':
      return colors.critical;
    default:
      return colors.border;
  }
}

export const paceGradient = [colors.resource, colors.healthy, colors.warning, colors.danger] as const;
