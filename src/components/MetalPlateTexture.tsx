import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const METAL_GRAIN = require('../../assets/metal-grain.png');

/** Reference card (~TOTAL SPENT) — fleck density target */
const REF_AREA = 340 * 120;
const REF_SPECKS_PANEL = 96;
const REF_SPECKS_SCREEN = 200;
const MAX_SPECKS_PANEL = 280;
const MAX_SPECKS_SCREEN = 480;

type Speck = {
  left: `${number}%`;
  top: `${number}%`;
  size: number;
  opacity: number;
  light: boolean;
};

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSpecks(seed: string, count: number): Speck[] {
  const rand = mulberry32(hashSeed(seed));
  const out: Speck[] = [];
  for (let i = 0; i < count; i += 1) {
    const left = `${(rand() * 100).toFixed(2)}%` as `${number}%`;
    const top = `${(rand() * 100).toFixed(2)}%` as `${number}%`;
    out.push({
      left,
      top,
      size: rand() < 0.15 ? 2 : 1,
      opacity: 0.08 + rand() * 0.28,
      light: rand() > 0.42,
    });
  }
  return out;
}

function speckCountForArea(area: number, isScreen: boolean): number {
  const ref = isScreen ? REF_SPECKS_SCREEN : REF_SPECKS_PANEL;
  const cap = isScreen ? MAX_SPECKS_SCREEN : MAX_SPECKS_PANEL;
  if (area <= 0) return ref;
  // Keep fleck density close to TOTAL SPENT so tall day plates don't look flat.
  const scaled = Math.round((area / REF_AREA) * ref);
  return Math.min(cap, Math.max(ref, scaled));
}

/**
 * Plate grit: one tiled grain layer + seeded flecks.
 * Speck count scales with panel area so expanded Spend day lists keep the
 * same metal density as short modules like TOTAL SPENT. Grain uses a single
 * `repeat` layer (no stacked strips) so tall plates don't lighten.
 *
 * One plate look everywhere — `compact` is ignored (kept for call-site compat).
 */
export function MetalPlateTexture({
  seed,
  compact: _compact = false,
  intensity = 'panel',
}: {
  seed: string;
  /** @deprecated no visual effect — all HUD panels share the same plate fill */
  compact?: boolean;
  /** `screen` = fuller grit for full-bleed backdrops */
  intensity?: 'panel' | 'screen';
}) {
  const isScreen = intensity === 'screen';
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      Math.abs(prev.w - width) < 0.5 && Math.abs(prev.h - height) < 0.5
        ? prev
        : { w: width, h: height },
    );
  };

  const area = size.w * size.h;
  const speckCount = speckCountForArea(area, isScreen);
  const specks = useMemo(() => buildSpecks(seed, speckCount), [seed, speckCount]);
  const drift = useMemo(() => {
    const rand = mulberry32(hashSeed(`drift:${seed}`));
    return {
      tx: Math.round((rand() - 0.5) * (isScreen ? 96 : 56)),
      ty: Math.round((rand() - 0.5) * (isScreen ? 72 : 40)),
      opacity: isScreen ? 0.52 : 0.5,
      shear: (rand() - 0.5) * 0.04,
    };
  }, [seed, isScreen]);

  const pad = isScreen ? 120 : 80;
  const grainW = Math.max(size.w + pad * 2, 1);
  const grainH = Math.max(size.h + pad * 2, 1);

  return (
    <View pointerEvents="none" style={styles.wrap} onLayout={onLayout}>
      <LinearGradient
        colors={[
          'rgba(210,198,160,0.05)',
          'transparent',
          'rgba(30,26,20,0.16)',
          'transparent',
        ]}
        locations={[0, 0.3, 0.62, 1]}
        start={{ x: drift.shear > 0 ? 0 : 0.2, y: 0 }}
        end={{ x: 1, y: drift.shear > 0 ? 0.55 : 0.2 }}
        style={StyleSheet.absoluteFill}
      />
      {size.w > 0 && size.h > 0 ? (
        <Image
          source={METAL_GRAIN}
          resizeMode="repeat"
          style={{
            position: 'absolute',
            width: grainW,
            height: grainH,
            left: -pad + drift.tx,
            top: -pad + drift.ty,
            opacity: drift.opacity,
          }}
        />
      ) : (
        <Image
          source={METAL_GRAIN}
          resizeMode="cover"
          style={[styles.grainFallback, { opacity: drift.opacity }]}
        />
      )}
      {specks.map((s, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            opacity: s.opacity * (isScreen ? 1.05 : 1),
            backgroundColor: s.light ? 'rgba(220,208,170,0.95)' : 'rgba(28,24,18,0.95)',
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  grainFallback: {
    position: 'absolute',
    top: '-20%',
    left: '-20%',
    width: '140%',
    height: '140%',
  },
});
