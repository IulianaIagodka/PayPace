/** Brand palette sampled from the Paypace app icon. */
export const colors = {
  // Cream → soft mint wash (icon background / pale segment)
  bgTop: '#FEFCF7',
  bgMid: '#F2F6EE',
  bgBottom: '#E8E3D9',

  // "Pay" ink + muted green-gray
  ink: '#182A22',
  inkSecondary: '#5A6B62',

  // Progress segments: forest → mid → lime → mint
  accent: '#2D6B52',
  accentMid: '#58AA7A',
  accentLight: '#B1DCAE',
  mint: '#E9F6DA',
  accentSoft: 'rgba(45, 107, 82, 0.14)',

  // Warm sand from the recessed track (not terracotta)
  warm: '#C4B5A0',
  danger: '#B85147',
  success: '#58AA7A',

  whiteSoft: 'rgba(255,255,255,0.78)',
  whiteSofter: 'rgba(255,255,255,0.62)',
};

/** Left→right fill matching the icon progress pills. */
export const paceGradient = ['#2D6B52', '#58AA7A', '#B1DCAE', '#E9F6DA'] as const;

export const spacing = {
  screen: 24,
};
