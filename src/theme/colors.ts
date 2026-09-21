/** PayPace HUD palette — industrial resource management */
export const colors = {
  bg: '#070908',
  bgGrid: '#0C100E',
  panel: '#121614',
  panelRaised: '#171C19',
  panelAlt: '#1B211D',
  panelDeep: '#0E1210',
  border: '#2E3832',
  borderBright: '#3D4A42',
  borderSoft: '#1A211D',
  metal: '#8A948C',
  metalDim: '#5C655E',

  resource: '#7DFF56',
  resourceDim: '#3FA82E',
  resourceGlow: 'rgba(125, 255, 86, 0.22)',
  resourceSoft: 'rgba(125, 255, 86, 0.10)',
  healthy: '#52D273',
  warning: '#F2B544',
  danger: '#E85A3F',
  critical: '#D92525',

  text: '#E8EDE6',
  textSecondary: '#8F978F',
  textDim: '#5E665F',

  // legacy aliases used by older screens during migration
  bgTop: '#070908',
  bgMid: '#070908',
  bgBottom: '#070908',
  ink: '#E8EDE6',
  inkSecondary: '#8F978F',
  accent: '#7DFF56',
  accentMid: '#52D273',
  accentLight: '#52D273',
  mint: '#1B211D',
  accentSoft: 'rgba(125, 255, 86, 0.12)',
  warm: '#F2B544',
  success: '#52D273',
  whiteSoft: '#121614',
  whiteSofter: '#1B211D',
};

export const spacing = {
  screen: 18,
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

export const ENVELOPE_ICONS: Record<string, string> = {
  food: '⬡',
  transport: '▷',
  kids: '◫',
  fun: '◇',
  home: '⌂',
  other: '▣',
};
