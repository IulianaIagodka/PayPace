/** PayPace HUD palette — industrial gunmetal matching design reference */
export const colors = {
  bg: '#0A0C0B',
  bgGrid: '#0E110F',
  panel: '#1A1F1C',
  panelRaised: '#222824',
  panelAlt: '#252B27',
  panelDeep: '#121612',
  border: '#3A433C',
  borderBright: '#5A655C',
  borderSoft: '#1E2420',
  metal: '#9AA39A',
  metalDim: '#6B746C',

  resource: '#7CFF4D',
  resourceDim: '#3FA82E',
  resourceGlow: 'rgba(124, 255, 77, 0.35)',
  resourceSoft: 'rgba(124, 255, 77, 0.12)',
  healthy: '#7CFF4D',
  warning: '#E8B84A',
  danger: '#E85A3F',
  critical: '#D92525',

  text: '#F2F4EE',
  textSecondary: '#9AA39A',
  textDim: '#6B746C',

  // legacy aliases
  bgTop: '#0A0C0B',
  bgMid: '#0A0C0B',
  bgBottom: '#0A0C0B',
  ink: '#F2F4EE',
  inkSecondary: '#9AA39A',
  accent: '#7CFF4D',
  accentMid: '#7CFF4D',
  accentLight: '#7CFF4D',
  mint: '#252B27',
  accentSoft: 'rgba(124, 255, 77, 0.12)',
  warm: '#E8B84A',
  success: '#7CFF4D',
  whiteSoft: '#1A1F1C',
  whiteSofter: '#252B27',
};

export const spacing = {
  screen: 16,
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

/** Last lit segment tips amber on healthy bars (reference look) */
export function segmentColor(index: number, lit: number, tone: ResourceTone): string {
  if (index >= lit) return '#151A16';
  if (tone === 'healthy' && lit > 1 && index === lit - 1) return colors.warning;
  return colorForTone(tone);
}

export const paceGradient = [colors.resource, colors.healthy, colors.warning, colors.danger] as const;

export const ENVELOPE_ICON_NAMES: Record<string, string> = {
  food: 'restaurant-outline',
  transport: 'bus-outline',
  kids: 'people-outline',
  fun: 'game-controller-outline',
  home: 'home-outline',
  other: 'grid-outline',
};
