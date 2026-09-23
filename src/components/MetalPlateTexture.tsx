import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const METAL_GRAIN = require('../../assets/metal-grain.png');

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

/**
 * Non-repeating plate grit: stretched organic grain + seeded random flecks
 * so adjacent cards don't look like the same tiled stamp.
 */
export function MetalPlateTexture({
  seed,
  compact = false,
  intensity = 'panel',
}: {
  seed: string;
  compact?: boolean;
  /** `screen` = fuller grit for full-bleed backdrops */
  intensity?: 'panel' | 'screen';
}) {
  const isScreen = intensity === 'screen';
  const speckCount = isScreen ? 200 : compact ? 28 : 64;
  const specks = useMemo(() => buildSpecks(seed, speckCount), [seed, speckCount]);
  const drift = useMemo(() => {
    const rand = mulberry32(hashSeed(`drift:${seed}`));
    return {
      tx: Math.round((rand() - 0.5) * (isScreen ? 80 : 48)),
      ty: Math.round((rand() - 0.5) * (isScreen ? 64 : 36)),
      scale: (isScreen ? 1.45 : 1.25) + rand() * 0.4,
      opacity: isScreen ? 0.52 : compact ? 0.28 : 0.42,
      shear: (rand() - 0.5) * 0.04,
    };
  }, [seed, compact, isScreen]);

  return (
    <View pointerEvents="none" style={styles.wrap}>
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
      {!compact || isScreen ? (
        <Image
          source={METAL_GRAIN}
          resizeMode="cover"
          style={[
            styles.grain,
            {
              opacity: drift.opacity,
              transform: [
                { translateX: drift.tx },
                { translateY: drift.ty },
                { scale: drift.scale },
              ],
            },
          ]}
        />
      ) : null}
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
  grain: {
    position: 'absolute',
    // Oversized so cover+offset never shows empty edges
    top: '-20%',
    left: '-20%',
    width: '140%',
    height: '140%',
  },
});
