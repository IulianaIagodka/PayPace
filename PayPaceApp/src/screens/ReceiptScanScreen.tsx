import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton, ScreenBackground, SecondaryButton, SoftCard } from '../components/ui';
import { categoryTitle } from '../services/categories';
import { categoryBalancesForDisplay } from '../services/categoryBalances';
import { formatMoney } from '../services/formatting';
import {
  analyzeReceiptPhoto,
  type ReceiptLineItem,
  type ReceiptScanResult,
} from '../services/receiptAnalyzer';
import { useBudget } from '../store/BudgetContext';
import { colors, paceGradient } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import type { ExpenseCategory } from '../models/types';
import { SPENDING_CATEGORIES } from '../services/categories';

type Props = NativeStackScreenProps<RootStackParamList, 'ReceiptScan'>;

export function ReceiptScanScreen({ navigation }: Props) {
  const { store, activeCycle, addExpenses, setPremium } = useBudget();
  const currency = store.settings.currencyCode;
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ReceiptScanResult | null>(null);

  const cycleItemCategory = (itemId: string) => {
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) => {
          if (item.id !== itemId) return item;
          const idx = SPENDING_CATEGORIES.indexOf(item.category);
          const next = SPENDING_CATEGORIES[(idx + 1) % SPENDING_CATEGORIES.length];
          return { ...item, category: next };
        }),
      };
    });
  };

  const grouped = useMemo(() => {
    if (!result) return [] as Array<{ category: ExpenseCategory; items: ReceiptLineItem[]; total: number }>;
    const map = new Map<ExpenseCategory, ReceiptLineItem[]>();
    for (const item of result.items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return SPENDING_CATEGORIES.map((category) => {
      const items = map.get(category) ?? [];
      return {
        category,
        items,
        total: items.reduce((sum, item) => sum + item.amount, 0),
      };
    }).filter((g) => g.items.length > 0);
  }, [result]);

  const cycleCategoryBalances = categoryBalancesForDisplay(activeCycle);

  if (!store.settings.isPremium) {
    return (
      <ScreenBackground edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.title}>Scan receipt</Text>
          <Text style={styles.sub}>
            Premium: сфотографуй чек — PayPace розпізнає позиції, згрупує за категоріями і покаже
            баланс по кожній.
          </Text>
          <PrimaryButton title="Unlock Premium (demo)" onPress={() => setPremium(true)} />
          <SecondaryButton title="Back" onPress={() => navigation.goBack()} />
        </ScrollView>
      </ScreenBackground>
    );
  }

  const pick = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow camera/photos to scan a receipt.');
      return;
    }

    const picked = fromCamera
      ? await ImagePicker.launchCameraAsync({
          quality: 0.7,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.7,
          base64: true,
          mediaTypes: ['images'],
        });

    if (picked.canceled || !picked.assets[0]?.uri) return;
    const asset = picked.assets[0];
    setPhotoUri(asset.uri);
    setResult(null);
    setScanning(true);
    try {
      const scanned = await analyzeReceiptPhoto(asset.uri, asset.base64);
      setResult(scanned);
    } catch (error) {
      Alert.alert('Scan failed', error instanceof Error ? error.message : 'Try another photo.');
    } finally {
      setScanning(false);
    }
  };

  const saveAll = async () => {
    if (!result?.items.length) return;
    await addExpenses(
      result.items.map((item) => ({
        name: item.name,
        amount: item.amount,
        category: item.category,
      })),
    );
    Alert.alert('Saved', 'Receipt items added to this pay cycle.', [
      { text: 'OK', onPress: () => navigation.navigate('Home') },
    ]);
  };

  const cycleCategory = (category: ExpenseCategory) =>
    formatMoney(
      (activeCycle?.expenses ?? [])
        .filter((e) => (e.category ?? 'other') === category)
        .reduce((sum, e) => sum + e.amount, 0) +
        (grouped.find((g) => g.category === category)?.total ?? 0),
      currency,
    );

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Scan receipt</Text>
        <Text style={styles.sub}>
          Зроби фото чеку. Позиції згрупуються за категоріями, і ти побачиш баланс по кожній.
        </Text>

        <PrimaryButton title="Take photo" onPress={() => pick(true)} />
        <SecondaryButton title="Choose from gallery" onPress={() => pick(false)} />

        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
        ) : null}

        {scanning ? (
          <SoftCard>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.sub}>Recognizing items…</Text>
          </SoftCard>
        ) : null}

        {result ? (
          <>
            <SoftCard>
              <Text style={styles.section}>
                {result.merchant ?? 'Receipt'} · {result.source === 'ai' ? 'AI' : 'Demo scan'}
              </Text>
              <Text style={styles.sub}>
                Total recognized: {formatMoney(result.total ?? 0, currency)}
              </Text>
            </SoftCard>

            {grouped.map((group) => (
              <SoftCard key={group.category}>
                <View style={styles.groupHead}>
                  <Text style={styles.section}>{categoryTitle(group.category)}</Text>
                  <Text style={styles.amount}>{formatMoney(group.total, currency)}</Text>
                </View>
                <Text style={styles.balanceHint}>
                  Category balance this cycle (incl. this receipt): {cycleCategory(group.category)}
                </Text>
                {group.items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => cycleItemCategory(item.id)}
                    style={styles.line}
                    accessibilityRole="button"
                    accessibilityLabel={`Change category for ${item.name}`}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.lineName}>{item.name}</Text>
                      <Text style={styles.tapHint}>Tap to change category</Text>
                    </View>
                    <Text style={styles.lineAmount}>{formatMoney(item.amount, currency)}</Text>
                  </Pressable>
                ))}
              </SoftCard>
            ))}

            <PrimaryButton title="Add all to spending" onPress={saveAll} />
          </>
        ) : null}

        <Text style={styles.section}>Category balances</Text>
        <SoftCard>
          {cycleCategoryBalances.every((c) => c.spent === 0) ? (
            <Text style={styles.sub}>Поки немає витрат по категоріях — відскануй чек або додай spending.</Text>
          ) : (
            cycleCategoryBalances.map((row) => (
              <View key={row.category} style={styles.balanceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName}>{row.title}</Text>
                  <View style={styles.barTrack}>
                    <LinearGradient
                      colors={[...paceGradient]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={[styles.barFill, { width: `${Math.max(row.share * 100, 4)}%` }]}
                    />
                  </View>
                </View>
                <Text style={styles.amount}>{formatMoney(row.spent, currency)}</Text>
              </View>
            ))
          )}
        </SoftCard>

        <Pressable onPress={() => navigation.navigate('CategoryBalances')}>
          <Text style={styles.link}>See all category balances</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 24, gap: 14, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '700', color: colors.ink },
  sub: { color: colors.inkSecondary, fontSize: 15, lineHeight: 21 },
  section: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  preview: { width: '100%', height: 200, borderRadius: 16, backgroundColor: colors.whiteSoft },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  balanceHint: { color: colors.inkSecondary, fontSize: 13, marginBottom: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  lineName: { color: colors.ink, fontSize: 15 },
  tapHint: { color: colors.inkSecondary, fontSize: 12, marginTop: 2 },
  lineAmount: { color: colors.ink, fontWeight: '600' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  barTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(24, 42, 34, 0.08)',
    overflow: 'hidden',
    marginTop: 6,
  },
  barFill: { height: '100%', borderRadius: 99 },
  link: { color: colors.accent, fontWeight: '700', fontSize: 15 },
});
