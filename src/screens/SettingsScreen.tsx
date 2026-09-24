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
import { HudButton, Panel, ScreenBackground, useTabBarClearance } from '../components/ui';
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
  const tabClearance = useTabBarClearance(72);
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

        <Panel>
          <Text style={styles.section}>BUDGET</Text>
          {s.isPremium ? (
            <HudButton
              title="ALLOCATE RESOURCES"
              onPress={() => navigation.navigate('Allocate')}
              variant="secondary"
            />
          ) : null}
          <HudButton
            title="EDIT CYCLE"
            onPress={() => navigation.navigate('PayCycle')}
            variant="secondary"
          />
          <HudButton title="BILLS" onPress={() => navigation.navigate('Bills')} variant="secondary" />
        </Panel>

        {s.isPremium ? (
          <Panel>
            <Text style={styles.section}>SHARE</Text>
            {household ? (
              <Text style={styles.subTight}>
                Linked · {household.members.map((m) => m.displayName).join(' & ')}
              </Text>
            ) : null}
            <HudButton
              title="SHARED BUDGET"
              onPress={() => navigation.navigate('SharedBudget')}
              variant="secondary"
            />
          </Panel>
        ) : null}

        <Panel>
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
        </Panel>

        <Panel>
          <Text style={styles.section}>PLUS</Text>
          {s.isPremium ? (
            allowDemoPremiumUnlock() ? (
              <>
                <Text style={styles.subTight}>
                  Category budgets, unlimited receipt scans, statement import, history, and a shared
                  budget with a partner.
                </Text>
                <HudButton
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
              <PlusUnlockButton />
              {!allowDemoPremiumUnlock() ? (
                <PlusUnlockButton preferRestore variant="secondary" />
              ) : null}
            </View>
          )}
        </Panel>

        <Panel>
          <Text style={styles.section}>LEGAL</Text>
          <HudButton
            title="PRIVACY POLICY"
            variant="secondary"
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          />
          <HudButton
            title="SUPPORT"
            variant="secondary"
            onPress={() => Linking.openURL(SUPPORT_URL)}
          />
        </Panel>

        {s.isPremium ? (
          <Panel>
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
              title={adding ? 'ADDING…' : 'ADD CATEGORY'}
              onPress={onAddCategory}
              disabled={!newCategory.trim() || adding}
              variant="secondary"
            />
          </Panel>
        ) : null}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  brand: { ...hudType.brand },
  sub: { ...hudType.body },
  subTight: { ...hudType.body, fontSize: 12, lineHeight: 16 },
  section: { ...hudType.label, color: colors.text, marginBottom: 4 },
  selectStack: { gap: 10 },
  plusCard: {
    gap: 10,
    marginTop: 4,
  },
  plusTitle: { ...hudType.bodyStrong },
  plusBody: { ...hudType.body },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 12,
  },
  customName: { ...hudType.bodyStrong, flex: 1 },
  remove: { ...hudType.link, color: colors.danger },
  input: {
    backgroundColor: colors.panelDeep,
    borderWidth: hud.stroke,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...hudType.field,
    fontSize: 15,
  },
});
