import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { hud, hudType, type HUDPanelVariant } from '../theme/hud';
import { MetalPlateTexture } from './MetalPlateTexture';

export type { HUDPanelVariant };

/**
 * Shared HUD module shell.
 * Same border geometry, corners, rivets, padding rhythm — three variants only.
 */
export function HUDPanel({
  variant = 'standard',
  label,
  labelTone,
  children,
  style,
  contentStyle,
  dense = false,
  /** Override grit seed so adjacent same-variant cards stay unique */
  seed,
}: {
  variant?: HUDPanelVariant;
  /** Optional top label — same position/type for every module */
  label?: string;
  /** Override label color; default follows variant (primary → green) */
  labelTone?: 'default' | 'primary' | 'warn';
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Tighter padding/gap — home category rail pods */
  dense?: boolean;
  seed?: string;
}) {
  const isPrimary = variant === 'primary';
  const isCompact = variant === 'compact';
  const corner = isPrimary ? colors.resource : colors.borderBright;
  const border = isPrimary ? colors.resource : colors.border;
  const tone = labelTone ?? (isPrimary ? 'primary' : 'default');
  const labelStyle =
    tone === 'primary' ? hudType.labelPrimary : tone === 'warn' ? hudType.labelWarn : hudType.label;
  const grainSeed = seed ?? `${variant}:${label ?? 'panel'}`;

  return (
    <View style={style}>
      <View
        style={[
          styles.shell,
          { borderColor: border },
          isCompact ? (dense ? styles.padDense : styles.padCompact) : styles.pad,
          dense && styles.shellDense,
        ]}
      >
        {/* Uniform plate fill — no height-stretched gradient (tall Spend days
            used to look like a lighter/different background than TOTAL SPENT). */}
        <View pointerEvents="none" style={styles.plate}>
          <View style={[StyleSheet.absoluteFill, styles.plateBase]} />
          <MetalPlateTexture seed={grainSeed} />
          {/* Fixed-height sheen so short and tall modules share the same tone */}
          <LinearGradient
            colors={['rgba(255,245,220,0.05)', 'transparent']}
            locations={[0, 1]}
            style={styles.plateSheen}
          />
        </View>

        <View style={[styles.corner, styles.cornerTL, { borderColor: corner }]} />
        <View style={[styles.corner, styles.cornerTR, { borderColor: corner }]} />
        <View style={[styles.corner, styles.cornerBL, { borderColor: corner }]} />
        <View style={[styles.corner, styles.cornerBR, { borderColor: corner }]} />
        <View style={[styles.rivet, styles.rivetTL]} />
        <View style={[styles.rivet, styles.rivetTR]} />
        <View style={[styles.rivet, styles.rivetBL]} />
        <View style={[styles.rivet, styles.rivetBR]} />
        {label ? (
          <Text style={[labelStyle, styles.fg]} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
        <View style={[styles.content, styles.fg, contentStyle]}>{children}</View>
      </View>
    </View>
  );
}

export function HudLabel({
  children,
  tone = 'default',
  style,
}: {
  children: React.ReactNode;
  tone?: 'default' | 'primary' | 'warn';
  style?: StyleProp<TextStyle>;
}) {
  const base =
    tone === 'primary' ? hudType.labelPrimary : tone === 'warn' ? hudType.labelWarn : hudType.label;
  return <Text style={[base, style]}>{children}</Text>;
}

export function HudValue({
  children,
  size = 'default',
  style,
}: {
  children: React.ReactNode;
  size?: 'hero' | 'default' | 'compact';
  style?: StyleProp<TextStyle>;
}) {
  const base =
    size === 'hero' ? hudType.valueHero : size === 'compact' ? hudType.valueCompact : hudType.value;
  return <Text style={[base, style]}>{children}</Text>;
}

export function HudMeta({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[hudType.meta, style]}>{children}</Text>;
}

export function HudBody({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[hudType.body, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 0,
    borderWidth: hud.stroke,
    overflow: 'hidden',
    gap: hud.gap,
    backgroundColor: colors.panel,
  },
  plate: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  plateBase: {
    backgroundColor: '#1A1612',
  },
  plateSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 72,
  },
  pad: {
    padding: hud.pad,
  },
  padCompact: {
    padding: hud.padCompact,
  },
  padDense: {
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  shellDense: {
    gap: 4,
  },
  fg: {
    zIndex: 1,
  },
  content: {
    gap: hud.gap,
  },
  corner: {
    position: 'absolute',
    width: hud.cornerSize,
    height: hud.cornerSize,
    zIndex: 2,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: hud.cornerStroke, borderLeftWidth: hud.cornerStroke },
  cornerTR: { top: 0, right: 0, borderTopWidth: hud.cornerStroke, borderRightWidth: hud.cornerStroke },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: hud.cornerStroke,
    borderLeftWidth: hud.cornerStroke,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: hud.cornerStroke,
    borderRightWidth: hud.cornerStroke,
  },
  rivet: {
    position: 'absolute',
    width: hud.rivet,
    height: hud.rivet,
    backgroundColor: colors.metalDim,
    borderWidth: 1,
    borderColor: colors.borderBright,
    zIndex: 2,
  },
  rivetTL: { top: hud.rivetInset, left: hud.rivetInset },
  rivetTR: { top: hud.rivetInset, right: hud.rivetInset },
  rivetBL: { bottom: hud.rivetInset, left: hud.rivetInset },
  rivetBR: { bottom: hud.rivetInset, right: hud.rivetInset },
});
