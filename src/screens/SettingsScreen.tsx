import React, { useState } from 'react';
import {
  Alert,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HudButton, ScreenBackground, useTabBarClearance } from '../components/ui';
import { HUDPanel } from '../components/HUDPanel';
import { PlusUnlockButton } from '../components/PlusUnlockButton';
import { HudSelect } from '../components/HudSelect';
import { WEEK_START_OPTIONS, type PaceHorizon, type WeekStartsOn } from '../models/calculator';
import { CURRENCIES } from '../services/currencies';
import {
  allowDemoPremiumUnlock,
  PRIVACY_POLICY_URL,
  SUPPORT_URL,
} from '../services/plusBilling';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { hud, hudType } from '../theme/hud';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Settings'>,
  NativeStackScreenProps<RootStackParamList>
>;

const HORIZON_OPTIONS: Array<{ value: PaceHorizon; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Until payday' },
];

export function SettingsScreen({ navigation }: Props) {
  const { store, updateSettings, setPremium, addCustomCategory, removeCustomCategory } =
    useBudget();
  const tabClearance = useTabBarClearance(48);
  const s = store.settings;
  const household = store.household;
  const weekStartsOn = (s.weekStartsOn ?? 1) as WeekStartsOn;
  const paceHorizon = (s.paceHorizon ?? 'week') as PaceHorizon;
  const customs = s.customCategories ?? [];
  const [newCategory, setNewCategory] = useState('');
  const [adding, setAdding] = useState(false);

  const currencyOptions = CURRENCIES.map((c) => ({
    value: c.code,
    label: `${c.code} · ${c.symbol}`,
  }));

  const weekOptions = WEEK_START_OPTIONS.map((o) => ({
    value: o.value,
    label: o.short,
  }));

  const onAddCategory = async () => {
    setAdding(true);
    try {
      await addCustomCategory(newCategory);
      setNewCategory('');
    } catch (error) {
      Alert.alert(
        'Custom category',
        error instanceof Error ? error.message : 'Could not add category.',
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.pad, { paddingBottom: tabClearance }]}
        scrollIndicatorInsets={{ bottom: tabClearance }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.brand}>
          PAY<Text style={hudType.brandAccent}>PACE</Text>
        </Text>
        <Text style={styles.sub}>Money is energy. Tune your payday budget here.</Text>

        <HUDPanel variant="compact" contentStyle={styles.panelInner}>
          <Text style={styles.section}>BUDGET</Text>
          {s.isPremium ? (
            <HudButton
              compact
              title="ALLOCATE RESOURCES"
              onPress={() => navigation.navigate('Allocate')}
              variant="secondary"
            />
          ) : null}
          <HudButton
            compact
            title="EDIT CYCLE"
            onPress={() => navigation.navigate('PayCycle')}
            variant="secondary"
          />
          <HudButton
            compact
            title="BILLS"
            onPress={() => navigation.navigate('Bills')}
            variant="secondary"
          />
        </HUDPanel>

        {s.isPremium ? (
          <HUDPanel variant="compact" contentStyle={styles.panelInner}>
            <Text style={styles.section}>SHARE</Text>
            {household ? (
              <Text style={styles.subTight}>
                Linked · {household.members.map((m) => m.displayName).join(' & ')}
              </Text>
            ) : null}
            <HudButton
              compact
              title="SHARED BUDGET"
              onPress={() => navigation.navigate('SharedBudget')}
              variant="secondary"
            />
          </HUDPanel>
        ) : null}

        <HUDPanel variant="compact" contentStyle={styles.panelInner}>
          <Text style={styles.section}>SYSTEM</Text>
          <View style={styles.selectStack}>
            <HudSelect
              label="CURRENCY"
              value={s.currencyCode}
              options={currencyOptions}
              onChange={(code) => updateSettings({ currencyCode: code })}
              compact
            />
            <HudSelect
              label="REMAINING HORIZON"
              value={paceHorizon}
              options={HORIZON_OPTIONS}
              onChange={(value) => updateSettings({ paceHorizon: value })}
              compact
            />
            <HudSelect
              label="WEEK STARTS ON"
              value={weekStartsOn}
              options={weekOptions}
              onChange={(value) => updateSettings({ weekStartsOn: value })}
              compact
            />
          </View>
        </HUDPanel>

        <HUDPanel variant="compact" contentStyle={styles.panelInner}>
          <Text style={styles.section}>PLUS</Text>
          {s.isPremium ? (
            allowDemoPremiumUnlock() ? (
              <>
                <Text style={styles.subTight}>
                  Category budgets, unlimited receipt scans, statement import, history, and a shared
                  budget with a partner.
                </Text>
                <HudButton
                  compact
                  title="BACK TO FREE (DEMO)"
                  onPress={() => setPremium(false)}
                  variant="secondary"
                />
              </>
            ) : (
              <Text style={styles.subTight}>
                Plus is on. Manage or cancel anytime in your Apple ID subscriptions.
              </Text>
            )
          ) : (
            <View style={styles.plusCard}>
              <Text style={styles.plusTitle}>Get more from your payday budget</Text>
              <Text style={styles.plusBody}>
                Category budgets, unlimited receipt scans, statement import, history, and a shared
                budget with a partner.
              </Text>
              <PlusUnlockButton compact />
              {!allowDemoPremiumUnlock() ? (
                <PlusUnlockButton compact preferRestore variant="secondary" />
              ) : null}
            </View>
          )}
        </HUDPanel>

        <HUDPanel variant="compact" contentStyle={styles.panelInner}>
          <Text style={styles.section}>LEGAL</Text>
          <HudButton
            compact
            title="PRIVACY POLICY"
            variant="secondary"
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          />
          <HudButton
            compact
            title="SUPPORT"
            variant="secondary"
            onPress={() => Linking.openURL(SUPPORT_URL)}
          />
        </HUDPanel>

        {s.isPremium ? (
          <HUDPanel variant="compact" contentStyle={styles.panelInner}>
            <Text style={styles.section}>CUSTOM CATEGORIES</Text>
            {customs.map((c) => (
              <View key={c.id} style={styles.customRow}>
                <Text style={styles.customName}>{c.title}</Text>
                <Pressable
                  onPress={() =>
                    Alert.alert('Remove category?', c.title, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => removeCustomCategory(c.id),
                      },
                    ])
                  }
                >
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>
            ))}
            <TextInput
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder="New category name"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => {
                Keyboard.dismiss();
                if (newCategory.trim()) onAddCategory();
              }}
            />
            <HudButton
              compact
              title={adding ? 'ADDING…' : 'ADD CATEGORY'}
              onPress={onAddCategory}
              disabled={!newCategory.trim() || adding}
              variant="secondary"
            />
          </HUDPanel>
        ) : null}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  panelInner: { gap: 6 },
  brand: { ...hudType.brand, fontSize: 20, letterSpacing: 2.5 },
  sub: { ...hudType.body, fontSize: 12, lineHeight: 16, marginBottom: 2 },
  subTight: { ...hudType.body, fontSize: 11, lineHeight: 15 },
  section: { ...hudType.label, color: colors.text, marginBottom: 2 },
  selectStack: { gap: 6 },
  plusCard: {
    gap: 8,
  },
  plusTitle: { ...hudType.bodyStrong, fontSize: 14 },
  plusBody: { ...hudType.body, fontSize: 12, lineHeight: 16 },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 12,
  },
  customName: { ...hudType.bodyStrong, fontSize: 14, flex: 1 },
  remove: { ...hudType.link, color: colors.danger, fontSize: 12 },
  input: {
    backgroundColor: colors.panelDeep,
    borderWidth: hud.stroke,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 40,
    ...hudType.field,
    fontSize: 14,
  },
});
