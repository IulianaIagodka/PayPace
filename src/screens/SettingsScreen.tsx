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
import { PlusMembershipCard } from '../components/PlusMembershipCard';
import { HudSelect } from '../components/HudSelect';
import { WEEK_START_OPTIONS, type PaceHorizon, type WeekStartsOn } from '../models/calculator';
import { CURRENCIES } from '../services/currencies';
import { PRIVACY_POLICY_URL, SUPPORT_URL, TERMS_OF_USE_URL } from '../services/plusBilling';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { hud, hudType, tabScreen } from '../theme/hud';
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
        contentContainerStyle={[tabScreen.pad, { paddingBottom: tabClearance }]}
        scrollIndicatorInsets={{ bottom: tabClearance }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={hudType.brand}>
          PAY<Text style={hudType.brandAccent}>PACE</Text>
        </Text>
        <Text style={hudType.body}>Money is energy. Tune your payday budget here.</Text>

        <PlusMembershipCard
          isPremium={s.isPremium}
          onDemoDowngrade={() => setPremium(false)}
        />

        <View style={styles.prefsBlock}>
          <Text style={styles.prefsLabel}>PREFERENCES</Text>

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
                <Text style={hudType.body}>
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

          {s.isPremium ? (
            <HUDPanel variant="compact" contentStyle={styles.panelInner}>
              <Text style={styles.section}>CUSTOM CATEGORIES</Text>
              {customs.map((c) => (
                <View key={c.id} style={styles.customRow}>
                  <Text style={[hudType.bodyStrong, styles.customName]}>{c.title}</Text>
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
        </View>

        <View style={styles.legalBlock}>
          <Text style={styles.section}>LEGAL</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(TERMS_OF_USE_URL)}
            hitSlop={8}
          >
            <Text style={styles.legalLink}>Terms of Use</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            hitSlop={8}
          >
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(SUPPORT_URL)}
            hitSlop={8}
          >
            <Text style={styles.legalLink}>Support</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  prefsBlock: { gap: 8, marginTop: 4 },
  prefsLabel: { ...hudType.label, color: colors.textDim, marginBottom: 0 },
  panelInner: { gap: 6 },
  section: { ...hudType.label, color: colors.text, marginBottom: 2 },
  selectStack: { gap: 6 },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 12,
  },
  customName: { flex: 1 },
  remove: { ...hudType.link, color: colors.danger },
  input: {
    backgroundColor: colors.panelDeep,
    borderWidth: hud.stroke,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 40,
    ...hudType.field,
  },
  legalBlock: {
    gap: 10,
    paddingTop: 4,
    paddingBottom: 4,
  },
  legalLink: {
    color: colors.resource,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.body,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
