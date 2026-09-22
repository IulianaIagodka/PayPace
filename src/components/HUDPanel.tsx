import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { hud, hudType, type HUDPanelVariant } from '../theme/hud';

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
}: {
  variant?: HUDPanelVariant;
  /** Optional top label — same position/type for every module */
  label?: string;
  /** Override label color; default follows variant (primary → green) */
  labelTone?: 'default' | 'primary' | 'warn';
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const isPrimary = variant === 'primary';
  const isCompact = variant === 'compact';
  const corner = isPrimary ? colors.resource : colors.borderBright;
  const border = isPrimary ? colors.resource : colors.border;
  const tone = labelTone ?? (isPrimary ? 'primary' : 'default');
  const labelStyle =
    tone === 'primary' ? hudType.labelPrimary : tone === 'warn' ? hudType.labelWarn : hudType.label;

  return (
    <View style={style}>
      <LinearGradient
        colors={isPrimary ? ['#1E3318', '#10180E'] : ['#262218', '#141210']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.shell,
          { borderColor: border },
          isCompact ? styles.padCompact : styles.pad,
        ]}
      >
        <View style={[styles.corner, styles.cornerTL, { borderColor: corner }]} />
        <View style={[styles.corner, styles.cornerTR, { borderColor: corner }]} />
        <View style={[styles.corner, styles.cornerBL, { borderColor: corner }]} />
        <View style={[styles.corner, styles.cornerBR, { borderColor: corner }]} />
        <View style={[styles.rivet, styles.rivetTL]} />
        <View style={[styles.rivet, styles.rivetTR]} />
        <View style={[styles.rivet, styles.rivetBL]} />
        <View style={[styles.rivet, styles.rivetBR]} />
        {label ? (
          <Text style={labelStyle} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
        <View style={[styles.content, contentStyle]}>{children}</View>
      </LinearGradient>
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
  },
  pad: {
    padding: hud.pad,
  },
  padCompact: {
    padding: hud.padCompact,
  },
  content: {
    gap: hud.gap,
  },
  corner: {
    position: 'absolute',
    width: hud.cornerSize,
    height: hud.cornerSize,
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
  },
  rivetTL: { top: hud.rivetInset, left: hud.rivetInset },
  rivetTR: { top: hud.rivetInset, right: hud.rivetInset },
  rivetBL: { bottom: hud.rivetInset, left: hud.rivetInset },
  rivetBR: { bottom: hud.rivetInset, right: hud.rivetInset },
});
