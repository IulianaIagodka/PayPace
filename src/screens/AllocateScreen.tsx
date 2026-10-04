import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AmountField, HudButton, Panel, ScreenBackground } from '../components/ui';
import { PlusUnlockButton } from '../components/PlusUnlockButton';
import { FormScroll } from '../components/FormScroll';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { formScreen, hud, hudType } from '../theme/hud';
import { currencySymbol, formatMoney, parseAmount } from '../services/formatting';
import { calculateSafeSpend } from '../models/calculator';
import { ensureEnvelopes } from '../services/envelopes';
import type { Envelope } from '../models/types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Allocate'>;

export function AllocateScreen({ navigation }: Props) {
  const { activeCycle, setEnvelopes, store } = useBudget();
  const suffix = currencySymbol(store.settings.currencyCode);
  const currency = store.settings.currencyCode;

  const spendPool = useMemo(() => {
    if (!activeCycle) return 0;
    const snap = calculateSafeSpend({ ...activeCycle, expenses: [] });
    // pool before expenses = remaining + spent
    return snap.remainingUntilPayday + snap.spentThisCycle;
  }, [activeCycle]);

  const [draft, setDraft] = useState<Envelope[]>(() =>
    activeCycle ? ensureEnvelopes(activeCycle).map((e) => ({ ...e })) : [],
  );

  if (!store.settings.isPremium) {
    return (
      <ScreenBackground edges={['left', 'right', 'bottom']}>
        <FormScroll contentContainerStyle={formScreen.compactPad}>
          <Text style={styles.title}>ALLOCATE RESOURCES</Text>
          <Text style={styles.sub}>
            Plus lets you split spending across categories and see what’s left in each one.
          </Text>
          <PlusUnlockButton />
          <HudButton compact title="BACK" onPress={() => navigation.goBack()} variant="secondary" />
        </FormScroll>
      </ScreenBackground>
    );
  }

  if (!activeCycle) {
    return (
      <ScreenBackground edges={['left', 'right', 'bottom']}>
        <View style={formScreen.compactPad}>
          <Text style={styles.title}>ALLOCATE RESOURCES</Text>
          <Text style={styles.sub}>No active cycle.</Text>
        </View>
      </ScreenBackground>
    );
  }

  const unallocated = spendPool - draft.reduce((s, e) => s + e.allocated, 0);

  const updateAlloc = (id: string, raw: string) => {
    const value = parseAmount(raw);
    setDraft((prev) =>
      prev.map((e) => (e.id === id ? { ...e, allocated: value ?? 0 } : e)),
    );
  };

  const save = async () => {
    await setEnvelopes(draft);
    navigation.goBack();
  };

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <FormScroll contentContainerStyle={formScreen.compactPad}>
        <Text style={styles.title}>ALLOCATE RESOURCES</Text>
        <Text style={styles.sub}>Decide how much each category gets this pay cycle.</Text>

        <Panel>
          <Text style={styles.label}>SPENDING POOL</Text>
          <Text style={styles.big}>{formatMoney(spendPool, currency)}</Text>
          <Text
            style={[
              styles.unalloc,
              unallocated < 0 && { color: colors.danger },
              unallocated === 0 && { color: colors.resource },
            ]}
          >
            UNALLOCATED {formatMoney(unallocated, currency)}
          </Text>
        </Panel>

        {draft.map((env) => (
          <View key={env.id} style={styles.allocBlock}>
            <AmountField compact
              label={env.title}
              value={String(env.allocated || '')}
              onChangeText={(t) => updateAlloc(env.id, t)}
              suffix={suffix}
            />
            <View style={styles.quick}>
              {[0.1, 0.15, 0.2, 0.25].map((share) => (
                <Pressable
                  key={share}
                  onPress={() =>
                    setDraft((prev) =>
                      prev.map((e) =>
                        e.id === env.id
                          ? { ...e, allocated: Math.round(spendPool * share) }
                          : e,
                      ),
                    )
                  }
                  style={styles.chip}
                  hitSlop={4}
                  accessibilityRole="button"
                >
                  <Text style={styles.chipText}>{Math.round(share * 100)}%</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <HudButton compact title="SAVE" onPress={save} />
        <HudButton compact title="CANCEL" onPress={() => navigation.goBack()} variant="secondary" />
      </FormScroll>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  title: { ...hudType.screenTitle },
  sub: { ...hudType.body },
  label: { ...hudType.label },
  big: { ...hudType.valueMid },
  unalloc: { ...hudType.meta, color: colors.warning },
  allocBlock: { gap: 6 },
  quick: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    borderWidth: hud.stroke,
    borderColor: colors.border,
    backgroundColor: colors.panelAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 0,
  },
  chipText: { ...hudType.label },
});
