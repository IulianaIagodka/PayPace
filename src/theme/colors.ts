/** PayPace HUD — cool industrial / cyber console (charcoal + cyan) */
export const colors = {
  bg: '#0A0D11',
  bgGrid: '#12171E',
  panel: '#141A22',
  panelRaised: '#1B2430',
  panelAlt: '#222C38',
  panelDeep: '#0C1016',
  border: '#3A4656',
  borderBright: '#6A7A8E',
  borderSoft: '#1A222C',
  metal: '#9AABBC',
  metalDim: '#5A6A7C',

  /** Ice cyan resource — primary HUD glow */
  resource: '#3DDCFF',
  resourceDim: '#1A8AAB',
  resourceGlow: 'rgba(61, 220, 255, 0.28)',
  resourceSoft: 'rgba(61, 220, 255, 0.12)',
  healthy: '#3DDCFF',
  /** Soft amber — caution, not neon */
  warning: '#E0B45A',
  /** Alert red */
  danger: '#E06058',
  critical: '#B03A38',

  text: '#F0F4F8',
  textSecondary: '#8A9AAB',
  textDim: '#4A5A6A',
  /** Primary readout — cool white */
  safeValue: '#E8F2F8',
  ammo: '#D8ECF8',

  // legacy aliases
  bgTop: '#0A0D11',
  bgMid: '#0A0D11',
  bgBottom: '#0A0D11',
  ink: '#F0F4F8',
  inkSecondary: '#8A9AAB',
  accent: '#3DDCFF',
  accentMid: '#3DDCFF',
  accentLight: '#3DDCFF',
  mint: '#222C38',
  accentSoft: 'rgba(61, 220, 255, 0.12)',
  warm: '#E0B45A',
  success: '#3DDCFF',
  whiteSoft: '#141A22',
  whiteSofter: '#222C38',
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

/** Healthy bars stay cyan; tip amber only when mid reserves */
export function segmentColor(index: number, lit: number, tone: ResourceTone): string {
  if (index >= lit) return '#0E141A';
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
