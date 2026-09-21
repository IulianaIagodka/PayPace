/** PayPace HUD — Doom-inspired industrial, kept sparse for readability */
export const colors = {
  bg: '#090A09',
  bgGrid: '#0E100E',
  panel: '#171B18',
  panelRaised: '#1E231F',
  panelAlt: '#222722',
  panelDeep: '#101310',
  border: '#3A413B',
  borderBright: '#5C655D',
  borderSoft: '#1A1E1A',
  metal: '#8E968E',
  metalDim: '#5F675F',

  resource: '#7CFF4D',
  resourceDim: '#3D9E2E',
  resourceGlow: 'rgba(124, 255, 77, 0.32)',
  resourceSoft: 'rgba(124, 255, 77, 0.10)',
  healthy: '#7CFF4D',
  warning: '#E0A83A',
  danger: '#D94A35',
  critical: '#C41E1E',

  text: '#F0F2EC',
  textSecondary: '#9AA19A',
  textDim: '#636B63',

  // legacy aliases
  bgTop: '#090A09',
  bgMid: '#090A09',
  bgBottom: '#090A09',
  ink: '#F0F2EC',
  inkSecondary: '#9AA19A',
  accent: '#7CFF4D',
  accentMid: '#7CFF4D',
  accentLight: '#7CFF4D',
  mint: '#222722',
  accentSoft: 'rgba(124, 255, 77, 0.10)',
  warm: '#E0A83A',
  success: '#7CFF4D',
  whiteSoft: '#171B18',
  whiteSofter: '#222722',
};

export const spacing = {
  screen: 16,
};

export type ResourceTone = 'healthy' | 'warning' | 'danger' | 'critical' | 'empty';

export function toneForRatio(remainingRatio: number): ResourceTone {
  if (remainingRatio <= 0) return 'critical';
  if (remainingRatio < 0.15) return 'danger';
  if (remainingRatio < 0.4) return 'warning';
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

/** Healthy bars tip amber on the last lit chunk (FPS HUD feel) */
export function segmentColor(index: number, lit: number, tone: ResourceTone): string {
  if (index >= lit) return '#121512';
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
