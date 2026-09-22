import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ImageBackground,
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Button,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colors,
  colorForTone,
  ENVELOPE_ICON_NAMES,
  segmentColor,
  toneForRatio,
  type ResourceTone,
} from '../theme/colors';
import { formatMoney, formatShortDate } from '../services/formatting';
import type { Bill, DailyExpense } from '../models/types';
import { fonts } from '../theme/fonts';

const STEEL = require('../../assets/steel-brush.png');

function HexBolt({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.bolt, style]}>
      <View style={styles.boltInner} />
      <View style={styles.boltCrossH} />
      <View style={styles.boltCrossV} />
    </View>
  );
}

function ChamferCorners() {
  return (
    <>
      <View style={[styles.chamfer, styles.chamferTL]} />
      <View style={[styles.chamfer, styles.chamferTR]} />
      <View style={[styles.chamfer, styles.chamferBL]} />
      <View style={[styles.chamfer, styles.chamferBR]} />
    </>
  );
}

export function ScreenBackground({
  children,
  edges = ['top', 'left', 'right'],
}: {
  children: React.ReactNode;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#2A3038', '#14181E', '#080A0C']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ImageBackground
        source={STEEL}
        style={StyleSheet.absoluteFill}
        imageStyle={styles.chassisSteelImg}
        resizeMode="repeat"
      />
      {/* Heavy chassis frame rails */}
      <View pointerEvents="none" style={[styles.rail, styles.railTop]}>
        <ImageBackground source={STEEL} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.7 }} resizeMode="repeat" />
        <LinearGradient colors={['#7A8490', '#3A4450', '#1A2028']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>
      <View pointerEvents="none" style={[styles.rail, styles.railBottom]}>
        <ImageBackground source={STEEL} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.7 }} resizeMode="repeat" />
        <LinearGradient colors={['#3A4450', '#1A2028', '#0A0E12']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>
      <View pointerEvents="none" style={[styles.rail, styles.railLeft]}>
        <ImageBackground source={STEEL} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.65 }} resizeMode="repeat" />
        <LinearGradient colors={['#6A7480', '#2A323A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </View>
      <View pointerEvents="none" style={[styles.rail, styles.railRight]}>
        <ImageBackground source={STEEL} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.65 }} resizeMode="repeat" />
        <LinearGradient colors={['#2A323A', '#0A0E12']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </View>
      <View pointerEvents="none" style={styles.chassisInnerWell} />
      <View pointerEvents="none" style={styles.seamH1} />
      <View pointerEvents="none" style={styles.seamH2} />
      <HexBolt style={styles.boltChassisTL} />
      <HexBolt style={styles.boltChassisTR} />
      <HexBolt style={styles.boltChassisBL} />
      <HexBolt style={styles.boltChassisBR} />
      <View pointerEvents="none" style={styles.vignette} />
      <SafeAreaView style={styles.flex} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

/**
 * Physical energy module / armor plate.
 * Metal housing with recessed holographic well — not a flat glowing card.
 */
export function Panel({
  children,
  style,
  alt,
  glow,
  innerGlow,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  alt?: boolean;
  glow?: boolean;
  innerGlow?: boolean;
}) {
  return (
    <View style={styles.moduleWrap}>
      {/* Raised metal shell */}
      <LinearGradient
        colors={alt ? ['#6A7480', '#3A4450', '#1A2028'] : ['#5C6672', '#323A44', '#161C22']}
        locations={[0, 0.35, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.2, y: 1 }}
        style={[styles.moduleShell, style]}
      >
        <ImageBackground
          source={STEEL}
          style={StyleSheet.absoluteFill}
          imageStyle={styles.moduleSteelImg}
          resizeMode="repeat"
        />
        <ChamferCorners />
        <HexBolt style={styles.boltTL} />
        <HexBolt style={styles.boltTR} />
        <HexBolt style={styles.boltBL} />
        <HexBolt style={styles.boltBR} />
        {/* Panel seam lines */}
        <View style={styles.moduleSeamTop} />
        <View style={styles.moduleSeamLeft} />

        {/* Recessed holographic well */}
        <View style={[styles.moduleWell, (glow || innerGlow) && styles.moduleWellLit]}>
          <LinearGradient
            colors={['#05070A', '#0A1016', '#06080C']}
            style={StyleSheet.absoluteFill}
          />
          {(glow || innerGlow) ? (
            <View pointerEvents="none" style={styles.holoInset}>
              <View style={styles.holoInsetTop} />
              <View style={styles.holoInsetSide} />
            </View>
          ) : null}
          <View style={styles.moduleContent}>{children}</View>
        </View>
      </LinearGradient>
    </View>
  );
}

export function StatusChip({ label = 'ONLINE' }: { label?: string }) {
  return (
    <View style={styles.chip}>
      <View style={styles.chipDot} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export function HudButton({
  title,
  onPress,
  disabled,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && styles.btnPrimary,
        variant === 'secondary' && styles.btnSecondary,
        variant === 'danger' && styles.btnDanger,
        disabled && { opacity: 0.35 },
        pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={['#4A5562', '#1A2430', '#0C141C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <LinearGradient
          colors={['#3A4450', '#1C242C', '#12181E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <ImageBackground
        source={STEEL}
        style={StyleSheet.absoluteFill}
        imageStyle={{ opacity: variant === 'danger' ? 0.2 : 0.4 }}
        resizeMode="repeat"
      />
      <ChamferCorners />
      <View style={styles.btnContent}>
        {title.startsWith('+') ? (
          <>
            <Text
              style={[
                styles.btnText,
                styles.btnPlus,
                variant === 'secondary' && { color: colors.text },
                variant === 'danger' && { color: colors.danger },
              ]}
            >
              +
            </Text>
            <Text
              style={[
                styles.btnText,
                variant === 'secondary' && { color: colors.text },
                variant === 'danger' && { color: colors.danger },
              ]}
            >
              {title.replace(/^\+\s*/, '')}
            </Text>
          </>
        ) : (
          <Text
            style={[
              styles.btnText,
              variant === 'secondary' && { color: colors.text },
              variant === 'danger' && { color: colors.danger },
            ]}
          >
            {title}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/** @deprecated alias */
export const PrimaryButton = HudButton;
export function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return <HudButton title={title} onPress={onPress} variant="secondary" />;
}
export const SoftCard = Panel;

export function SegmentedBar({
  ratio,
  segments = 10,
  height = 22,
  animateFrom,
  compact,
  tipAmber = true,
}: {
  ratio: number;
  segments?: number;
  height?: number;
  animateFrom?: number;
  compact?: boolean;
  tipAmber?: boolean;
}) {
  const clamped = Math.max(0, Math.min(ratio, 1));
  const anim = useRef(new Animated.Value(animateFrom ?? clamped)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [clamped, anim]);

  const tone = toneForRatio(clamped);
  const lit = Math.round(clamped * segments);

  return (
    <View style={[styles.barTrack, { height }, compact && styles.barTrackCompact]}>
      {Array.from({ length: segments }).map((_, i) => {
        const bg =
          tipAmber && tone === 'healthy'
            ? segmentColor(i, lit, tone)
            : i < lit
              ? colorForTone(tone)
              : '#0E141A';
        return (
          <View
            key={i}
            style={[
              styles.barSeg,
              compact && styles.barSegCompact,
              {
                backgroundColor: bg,
                shadowColor: i < lit ? colorForTone(tone) : 'transparent',
                shadowOpacity: i < lit ? 0.45 : 0,
                shadowRadius: compact ? 2 : 4,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/** Battery / energy cell bank recessed into metal housing */
export function ResourceBattery({
  ratio,
  segments = 12,
  animateFrom,
  tipAmber = true,
}: {
  ratio: number;
  segments?: number;
  animateFrom?: number;
  tipAmber?: boolean;
}) {
  return (
    <View style={styles.batteryFrame}>
      <View style={styles.batteryCap}>
        <LinearGradient colors={['#8A94A0', '#4A5460', '#2A323A']} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.batteryBody}>
        <ImageBackground
          source={STEEL}
          style={StyleSheet.absoluteFill}
          imageStyle={{ opacity: 0.35 }}
          resizeMode="repeat"
        />
        <View style={styles.batteryWell}>
          <SegmentedBar
            ratio={ratio}
            segments={segments}
            height={20}
            animateFrom={animateFrom}
            tipAmber={tipAmber}
          />
        </View>
      </View>
    </View>
  );
}

export function EnvelopeModule({
  title,
  spent,
  allocated,
  currencyCode,
  tone,
  warning,
  depleted,
}: {
  title: string;
  spent: number;
  allocated: number;
  currencyCode: string;
  tone: ResourceTone;
  warning?: boolean;
  depleted?: boolean;
}) {
  const remainingRatio = allocated > 0 ? Math.max(allocated - spent, 0) / allocated : 0;
  return (
    <Panel style={styles.module}>
      <View style={styles.moduleHead}>
        <Text style={styles.moduleTitle}>{title}</Text>
        <Text style={[styles.moduleAmount, { color: colorForTone(tone) }]}>
          {formatMoney(spent, currencyCode)} / {formatMoney(allocated, currencyCode)}
        </Text>
      </View>
      <SegmentedBar ratio={remainingRatio} segments={8} height={12} compact />
      {depleted ? <Text style={styles.criticalLabel}>DEPLETED</Text> : null}
      {warning && !depleted ? (
        <Text style={styles.warnLabel}>
          WARNING · reserve at {Math.round(remainingRatio * 100)}%
        </Text>
      ) : null}
    </Panel>
  );
}

export function CategoryCell({
  title,
  iconKey,
  spent,
  allocated,
  currencyCode,
  tone,
  index = 0,
  onPress,
  periodShare = 1,
  horizonLabel = 'CYCLE',
  depleted = false,
  layout = 'grid',
}: {
  title: string;
  iconKey: string;
  spent: number;
  allocated: number;
  currencyCode: string;
  tone: ResourceTone;
  index?: number;
  onPress?: () => void;
  /** Fraction of cycle remaining that belongs to the selected week/month window. */
  periodShare?: number;
  horizonLabel?: string;
  depleted?: boolean;
  /** `rail` = fixed-width vertical pod for horizontal scroll */
  layout?: 'grid' | 'rail';
}) {
  const cycleRemaining = Math.max(allocated - spent, 0);
  const periodRemaining = cycleRemaining * Math.max(0, Math.min(periodShare, 1));
  const remainingRatio = allocated > 0 ? cycleRemaining / allocated : 0;
  const enter = useRef(new Animated.Value(0)).current;
  const muted = depleted || remainingRatio <= 0;
  const tipAmber = tone === 'healthy' && remainingRatio < 0.85 && remainingRatio >= 0.4;
  const isRail = layout === 'rail';

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 240,
      delay: 40 + index * 40,
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  const iconName = (ENVELOPE_ICON_NAMES[iconKey] ??
    ENVELOPE_ICON_NAMES.other) as keyof typeof Ionicons.glyphMap;

  return (
    <Animated.View
      style={{
        flex: isRail ? undefined : 1,
        width: isRail ? 118 : undefined,
        opacity: enter,
        transform: [
          {
            translateY: enter.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          },
        ],
      }}
    >
      <Pressable onPress={onPress} disabled={!onPress} style={{ flex: isRail ? undefined : 1, opacity: muted ? 0.48 : 1 }}>
        <Panel style={isRail ? styles.cellRail : styles.cell} glow={false} innerGlow={!muted && isRail}>
          {isRail ? (
            <View style={{ alignItems: 'center', gap: 10 }}>
              <View style={styles.cellIconWrap}>
                <Ionicons
                  name={iconName}
                  size={22}
                  color={muted ? colors.textDim : colors.resource}
                />
              </View>
              <Text style={[styles.cellTitleRail, muted && { color: colors.textDim }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[styles.cellAmountRail, muted && { color: colors.textDim }]} numberOfLines={1}>
                {formatMoney(spent, currencyCode)}
                <Text style={styles.cellAmountDim}> / {formatMoney(allocated, currencyCode)}</Text>
              </Text>
              <View style={{ alignSelf: 'stretch' }}>
                <SegmentedBar
                  ratio={remainingRatio}
                  segments={6}
                  height={8}
                  compact
                  tipAmber={tipAmber}
                />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.cellTitleRow}>
                <Ionicons
                  name={iconName}
                  size={15}
                  color={muted ? colors.textDim : colors.textSecondary}
                />
                <Text style={[styles.cellTitle, muted && { color: colors.textDim }]} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.cellHorizon}>{muted ? 'EMPTY' : horizonLabel}</Text>
              </View>
              <Text style={[styles.cellAmount, muted && { color: colors.textDim }]} numberOfLines={1}>
                {formatMoney(periodRemaining, currencyCode)}
                <Text style={styles.cellAmountDim}>
                  {' '}
                  / {formatMoney(cycleRemaining, currencyCode)}
                </Text>
              </Text>
              <SegmentedBar
                ratio={remainingRatio}
                segments={8}
                height={9}
                compact
                tipAmber={tipAmber}
              />
            </>
          )}
        </Panel>
      </Pressable>
    </Animated.View>
  );
}

/** Empty steel plate to keep the 2-col grid balanced */
export function EmptyCell() {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.emptyCell} />
    </View>
  );
}

const AMOUNT_ACCESSORY_ID = 'paypace.amount.done';

/** Mount once near app root so decimal-pad fields get a Done button. */
export function AmountDoneAccessory() {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={AMOUNT_ACCESSORY_ID}>
      <View style={styles.accessory}>
        <View style={{ flex: 1 }} />
        <Button title="Done" onPress={Keyboard.dismiss} color={colors.resource} />
      </View>
    </InputAccessoryView>
  );
}

export function AmountField({
  label,
  value,
  onChangeText,
  suffix = 'USD',
  ...rest
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  suffix?: string;
} & TextInputProps) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldBox}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textDim}
          style={styles.fieldInput}
          inputAccessoryViewID={Platform.OS === 'ios' ? AMOUNT_ACCESSORY_ID : undefined}
          {...rest}
        />
        <Text style={styles.suffix}>{suffix}</Text>
      </View>
    </View>
  );
}

export function ExpenseRow({
  expense,
  currencyCode,
  onDelete,
  showChevron,
}: {
  expense: DailyExpense;
  currencyCode: string;
  onDelete?: () => void;
  showChevron?: boolean;
}) {
  const iconKey = expense.envelopeKey ?? expense.category ?? 'other';
  const iconName = (ENVELOPE_ICON_NAMES[iconKey] ??
    ENVELOPE_ICON_NAMES.other) as keyof typeof Ionicons.glyphMap;

  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={iconName} size={16} color={colors.resource} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowTitle}>{expense.name}</Text>
        <Text style={styles.meta}>
          {formatShortDate(expense.date)}
          {expense.memberName ? ` · ${expense.memberName}` : ''}
        </Text>
      </View>
      <Text style={styles.rowAmount}>-{formatMoney(expense.amount, currencyCode)}</Text>
      {showChevron ? <Ionicons name="chevron-forward" size={14} color={colors.textDim} /> : null}
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={10} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>DEL</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function BillRow({ bill, currencyCode }: { bill: Bill; currencyCode: string }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowTitle}>{bill.name}</Text>
        <Text style={styles.meta}>{formatShortDate(bill.dueDate)}</Text>
      </View>
      <Text style={styles.rowAmount}>{formatMoney(bill.amount, currencyCode)}</Text>
    </View>
  );
}

export function SafeSpendHero({
  safeToday,
  remaining,
  daysUntil,
  currencyCode,
  isAtRisk,
}: {
  safeToday: number;
  remaining: number;
  daysUntil: number;
  currencyCode: string;
  isAtRisk: boolean;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.fieldLabel}>SAFE TO SPEND</Text>
      <Text style={[styles.heroAmount, isAtRisk && { color: colors.danger }]}>
        {formatMoney(Math.max(safeToday, 0), currencyCode)}
      </Text>
      <Text style={styles.meta}>
        {formatMoney(remaining, currencyCode)} resources · {daysUntil} days left
      </Text>
    </View>
  );
}

export function CycleProgress({
  progress,
  daysElapsed,
  totalDays,
}: {
  progress: number;
  daysElapsed: number;
  totalDays: number;
}) {
  return (
    <View style={{ gap: 8 }}>
      <SegmentedBar ratio={1 - progress} segments={12} height={10} />
      <Text style={styles.meta}>
        {daysElapsed} / {totalDays} days
      </Text>
    </View>
  );
}

export function HeaderIconButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.headerBtn}>
      <Text style={styles.headerBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: '#0A0C0E' },
  chassisSteelImg: { opacity: 0.42 },
  rail: {
    position: 'absolute',
    overflow: 'hidden',
  },
  railTop: { top: 0, left: 0, right: 0, height: 16 },
  railBottom: { bottom: 0, left: 0, right: 0, height: 16 },
  railLeft: { top: 16, bottom: 16, left: 0, width: 14 },
  railRight: { top: 16, bottom: 16, right: 0, width: 14 },
  chassisInnerWell: {
    position: 'absolute',
    top: 16,
    right: 14,
    bottom: 16,
    left: 14,
    borderWidth: 2,
    borderTopColor: 'rgba(0,0,0,0.65)',
    borderLeftColor: 'rgba(0,0,0,0.55)',
    borderRightColor: 'rgba(140,150,160,0.18)',
    borderBottomColor: 'rgba(140,150,160,0.12)',
  },
  seamH1: {
    position: 'absolute',
    top: 56,
    left: 22,
    right: 22,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(180,190,200,0.15)',
  },
  seamH2: {
    position: 'absolute',
    bottom: 78,
    left: 22,
    right: 22,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(180,190,200,0.1)',
  },
  boltChassisTL: { position: 'absolute', top: 20, left: 20 },
  boltChassisTR: { position: 'absolute', top: 20, right: 20 },
  boltChassisBL: { position: 'absolute', bottom: 20, left: 20 },
  boltChassisBR: { position: 'absolute', bottom: 20, right: 20 },
  vignette: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 24,
    borderColor: 'rgba(0,0,0,0.45)',
  },
  bolt: {
    width: 11,
    height: 11,
    borderRadius: 2,
    backgroundColor: '#6A7480',
    borderWidth: 1,
    borderTopColor: '#A8B0B8',
    borderLeftColor: '#A8B0B8',
    borderRightColor: '#2A3038',
    borderBottomColor: '#2A3038',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  boltInner: {
    ...StyleSheet.absoluteFill,
    margin: 2,
    backgroundColor: '#4A5460',
    borderRadius: 1,
  },
  boltCrossH: {
    position: 'absolute',
    width: 7,
    height: 1.5,
    backgroundColor: '#1A1E22',
  },
  boltCrossV: {
    position: 'absolute',
    width: 1.5,
    height: 7,
    backgroundColor: '#1A1E22',
  },
  chamfer: {
    position: 'absolute',
    width: 0,
    height: 0,
    zIndex: 4,
    borderStyle: 'solid',
  },
  chamferTL: {
    top: 0,
    left: 0,
    borderTopWidth: 10,
    borderRightWidth: 10,
    borderTopColor: '#0A0C0E',
    borderRightColor: 'transparent',
  },
  chamferTR: {
    top: 0,
    right: 0,
    borderTopWidth: 10,
    borderLeftWidth: 10,
    borderTopColor: '#0A0C0E',
    borderLeftColor: 'transparent',
  },
  chamferBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 10,
    borderRightWidth: 10,
    borderBottomColor: '#0A0C0E',
    borderRightColor: 'transparent',
  },
  chamferBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 10,
    borderLeftWidth: 10,
    borderBottomColor: '#0A0C0E',
    borderLeftColor: 'transparent',
  },
  moduleWrap: {
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  moduleShell: {
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#8A94A0',
    borderLeftColor: '#6A7480',
    borderRightColor: '#1A2028',
    borderBottomColor: '#0A0E12',
    padding: 8,
    overflow: 'hidden',
  },
  moduleSteelImg: { opacity: 0.62 },
  moduleSeamTop: {
    position: 'absolute',
    top: 7,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  moduleSeamLeft: {
    position: 'absolute',
    top: 18,
    bottom: 18,
    left: 7,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  boltTL: { position: 'absolute', top: 5, left: 5 },
  boltTR: { position: 'absolute', top: 5, right: 5 },
  boltBL: { position: 'absolute', bottom: 5, left: 5 },
  boltBR: { position: 'absolute', bottom: 5, right: 5 },
  moduleWell: {
    marginTop: 4,
    marginBottom: 2,
    marginHorizontal: 2,
    borderWidth: 2,
    borderTopColor: '#050608',
    borderLeftColor: '#050608',
    borderRightColor: '#3A4450',
    borderBottomColor: '#4A5460',
    padding: 12,
    gap: 8,
    overflow: 'hidden',
    minHeight: 48,
  },
  moduleWellLit: {
    shadowColor: colors.resource,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  holoInset: {
    ...StyleSheet.absoluteFill,
  },
  holoInsetTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.resource,
    opacity: 0.45,
  },
  holoInsetSide: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 1,
    backgroundColor: colors.resource,
    opacity: 0.25,
  },
  moduleContent: {
    gap: 8,
    zIndex: 1,
  },
  batteryFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  batteryCap: {
    width: 7,
    height: 18,
    borderRadius: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderTopColor: '#A8B0B8',
    borderLeftColor: '#8A94A0',
    borderRightColor: '#2A3038',
    borderBottomColor: '#1A2028',
  },
  batteryBody: {
    flex: 1,
    borderWidth: 2,
    borderTopColor: '#8A94A0',
    borderLeftColor: '#6A7480',
    borderRightColor: '#1A2028',
    borderBottomColor: '#0A0E12',
    padding: 5,
    borderRadius: 2,
    overflow: 'hidden',
  },
  batteryWell: {
    borderWidth: 2,
    borderTopColor: '#050608',
    borderLeftColor: '#050608',
    borderRightColor: '#3A4450',
    borderBottomColor: '#4A5460',
    padding: 3,
    backgroundColor: '#05070A',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.resource,
    backgroundColor: colors.resourceSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 2,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 0,
    backgroundColor: colors.resource,
  },
  chipText: {
    color: colors.resource,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2,
  },
  btn: {
    borderRadius: 2,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderTopColor: '#8A94A0',
    borderLeftColor: '#6A7480',
    borderRightColor: '#1A2028',
    borderBottomColor: '#0A0E12',
    overflow: 'hidden',
    minHeight: 54,
  },
  btnPrimary: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  btnSecondary: {},
  btnDanger: {
    borderTopColor: '#A06060',
    borderLeftColor: '#804040',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnText: {
    color: colors.resource,
    fontSize: 15,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: 2.6,
  },
  btnPlus: {
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0,
    marginRight: 8,
  },
  barTrack: {
    flexDirection: 'row',
    gap: 3,
    backgroundColor: '#080C10',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 2,
    padding: 3,
  },
  barTrackCompact: { gap: 2, padding: 2 },
  barSeg: { flex: 1, borderRadius: 1 },
  barSegCompact: { borderRadius: 1 },
  module: { gap: 8 },
  moduleHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  moduleTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  moduleAmount: { color: colors.text, fontSize: 13, fontWeight: '700', fontFamily: fonts.body },
  warnLabel: { color: colors.warning, fontSize: 11, letterSpacing: 0.8, fontWeight: '600' },
  criticalLabel: { color: colors.critical, fontSize: 11, letterSpacing: 1, fontWeight: '700' },
  cell: { gap: 8, paddingVertical: 12, paddingHorizontal: 12, minHeight: 92 },
  cellRail: {
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 148,
    alignItems: 'center',
  },
  cellIconWrap: {
    width: 40,
    height: 40,
    borderWidth: 1.5,
    borderColor: colors.borderBright,
    backgroundColor: colors.resourceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cellTitle: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  cellTitleRail: {
    color: colors.text,
    fontSize: 13,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  cellHorizon: {
    color: colors.textDim,
    fontSize: 9,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cellAmount: {
    fontSize: 13,
    fontFamily: fonts.display,
    fontWeight: '700',
    color: colors.ammo,
  },
  cellAmountRail: {
    fontSize: 11,
    fontFamily: fonts.display,
    fontWeight: '700',
    color: colors.ammo,
    textAlign: 'center',
  },
  cellAmountDim: { color: colors.textDim, fontWeight: '600' },
  emptyCell: {
    flex: 1,
    minHeight: 92,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
    backgroundColor: colors.panelDeep,
    opacity: 0.45,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A1016',
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: '#050608',
    borderLeftColor: '#050608',
    borderRightColor: '#4A5460',
    borderBottomColor: '#5A6570',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: colors.ammo,
    fontFamily: fonts.display,
  },
  suffix: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  accessory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141A22',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowIcon: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.resourceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600', fontFamily: fonts.body },
  rowAmount: { color: colors.ammo, fontSize: 15, fontWeight: '700', fontFamily: fonts.display },
  meta: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.body },
  deleteBtn: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
  deleteText: { color: colors.danger, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  heroAmount: { color: colors.ammo, fontSize: 40, fontWeight: '800', fontFamily: fonts.display },
  headerBtn: {
    minHeight: 40,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    borderRadius: 2,
  },
  headerBtnText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: fonts.label,
  },
});
