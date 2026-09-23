import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { newId } from '../services/id';
import { buildDayPaceLock, calculateSafeSpend } from '../models/calculator';
import {
  emptyStore,
  type AppSettings,
  type AppStoreData,
  type Bill,
  type DailyExpense,
  type Household,
  type HouseholdMember,
  type PayCycle,
  type SafeSpendSnapshot,
  type SharedHouseholdPayload,
  type TrajectoryLabel,
} from '../models/types';
import { loadStore, saveStore } from '../services/persistence';
import { asMoney, toDateKey } from '../services/formatting';
import { findCycleForDate } from '../services/cycleMatching';
import { getDeviceId } from '../services/deviceIdentity';
import { generateInviteCode, normalizeInviteCode } from '../services/inviteCode';
import { mergeSharedPayloads, toSharedPayload } from '../services/householdMerge';
import { ensureEnvelopes, categoryToEnvelopeKey, makeCustomEnvelope } from '../services/envelopes';
import {
  cloudFetchById,
  cloudFetchByInviteCode,
  cloudUpsertPayload,
  isCloudSyncConfigured,
  subscribeHouseholdChanges,
} from '../services/householdCloud';
import { HOUSEHOLD_POLL_MS } from '../services/householdSyncPolicy';
import type { PaceMetrics } from '../services/partnerMetricsNotify';
import { notifyPaceMetricsChanged } from '../services/partnerNotify';

/** Background reconcile while the app is open. Live partner edits use Realtime. */

function paceMetricsFromStore(data: AppStoreData): PaceMetrics {
  const cycle = data.cycles.find((c) => c.isActive) ?? data.cycles[0] ?? null;
  if (!cycle) {
    return {
      remainingUntilPayday: 0,
      safeToSpendToday: 0,
      spentThisCycle: 0,
      unpaidBillsTotal: 0,
      currentBalance: 0,
    };
  }
  const snap = calculateSafeSpend(cycle, new Date(), data.settings.weekStartsOn ?? 1);
  return {
    remainingUntilPayday: snap.remainingUntilPayday,
    safeToSpendToday: snap.safeToSpendToday,
    spentThisCycle: snap.spentThisCycle,
    unpaidBillsTotal: snap.unpaidBillsTotal,
    currentBalance: asMoney(cycle.currentBalance),
  };
}

type BudgetContextValue = {
  ready: boolean;
  store: AppStoreData;
  activeCycle: PayCycle | null;
  snapshot: SafeSpendSnapshot;
  localMember: HouseholdMember | null;
  cloudSyncReady: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  syncError: string | null;
  completeOnboarding: (cycle: PayCycle) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  updateActiveCycle: (mutate: (cycle: PayCycle) => PayCycle) => Promise<void>;
  addBill: (bill: Omit<Bill, 'id'> & { id?: string }) => Promise<void>;
  updateBill: (bill: Bill) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  addExpense: (expense: Omit<DailyExpense, 'id' | 'date'> & { id?: string; date?: string }) => Promise<void>;
  addExpenses: (
    expenses: Array<Omit<DailyExpense, 'id' | 'date'> & { id?: string; date?: string }>,
  ) => Promise<void>;
  /** Route each expense into the pay cycle that owns its date. */
  importExpensesByDate: (
    expenses: Array<Omit<DailyExpense, 'id' | 'date'> & { id?: string; date?: string }>,
  ) => Promise<{ cycleCount: number; itemCount: number }>;
  deleteExpense: (id: string) => Promise<void>;
  replaceActiveCycle: (cycle: PayCycle) => Promise<void>;
  resetAll: () => Promise<void>;
  setPremium: (enabled: boolean) => Promise<void>;
  setEnvelopes: (envelopes: PayCycle['envelopes']) => Promise<void>;
  addCustomCategory: (title: string) => Promise<void>;
  removeCustomCategory: (id: string) => Promise<void>;
  createHousehold: (displayName: string, householdName?: string) => Promise<Household>;
  joinHousehold: (inviteCode: string, displayName: string) => Promise<Household>;
  leaveHousehold: () => Promise<void>;
  renameLocalMember: (displayName: string) => Promise<void>;
  syncHouseholdNow: () => Promise<void>;
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

function stamp(): string {
  return new Date().toISOString();
}

function withCycleTouch(cycle: PayCycle): PayCycle {
  return { ...cycle, updatedAt: stamp() };
}

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<AppStoreData>(emptyStore);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const storeRef = useRef(store);
  storeRef.current = store;
  const syncingRef = useRef(false);
  const syncHouseholdNowRef = useRef<(() => Promise<void>) | null>(null);

  const persist = useCallback(async (next: AppStoreData) => {
    setStore(next);
    storeRef.current = next;
    await saveStore(next);
  }, []);

  const pushIfShared = useCallback(async (next: AppStoreData) => {
    if (!next.household || !isCloudSyncConfigured()) return 'disabled' as const;
    const payload = toSharedPayload({
      household: next.household,
      currencyCode: next.settings.currencyCode,
      cycles: next.cycles,
      customCategories: next.settings.customCategories,
    });
    return cloudUpsertPayload(payload);
  }, []);

  const commit = useCallback(
    async (next: AppStoreData, opts?: { skipPush?: boolean }) => {
      let payload = next;
      if (payload.household && !opts?.skipPush) {
        payload = {
          ...payload,
          household: {
            ...payload.household,
            revision: payload.household.revision + 1,
            updatedAt: stamp(),
          },
        };
      }
      await persist(payload);
      if (!opts?.skipPush) {
        try {
          const result = await pushIfShared(payload);
          if (result === 'skipped_stale') {
            // Cloud is newer — pull instead of keeping a silent stale local push.
            setSyncStatus('idle');
            setSyncError(null);
            void syncHouseholdNowRef.current?.();
          } else {
            setSyncStatus('idle');
            setSyncError(null);
          }
        } catch (error) {
          setSyncStatus('error');
          setSyncError(error instanceof Error ? error.message : 'Sync failed');
        }
      }
    },
    [persist, pushIfShared],
  );

  const applyRemotePayload = useCallback(
    async (remote: SharedHouseholdPayload, localMemberId: string | null) => {
      const current = storeRef.current;
      if (!current.household) return;
      const beforeMetrics = paceMetricsFromStore(current);
      const localPayload = toSharedPayload({
        household: current.household,
        currencyCode: current.settings.currencyCode,
        cycles: current.cycles,
        customCategories: current.settings.customCategories,
      });
      const merged = mergeSharedPayloads(localPayload, remote);
      const next: AppStoreData = {
        ...current,
        household: merged.household,
        localMemberId:
          localMemberId ??
          current.localMemberId ??
          merged.household.members.find((m) => m.id === current.localMemberId)?.id ??
          null,
        settings: {
          ...current.settings,
          currencyCode: merged.settings.currencyCode || current.settings.currencyCode,
          customCategories:
            merged.settings.customCategories ?? current.settings.customCategories ?? [],
          hasCompletedOnboarding: true,
        },
        cycles: merged.cycles.length ? merged.cycles : current.cycles,
      };
      if (
        next.localMemberId &&
        next.household &&
        !next.household.members.some((m) => m.id === next.localMemberId)
      ) {
        next.localMemberId = next.household.members[0]?.id ?? null;
      }
      await persist(next);

      // Partner (or remote) edits that move headline numbers → local notification.
      if (remote.revision > (current.household.revision ?? 0)) {
        void notifyPaceMetricsChanged({
          before: beforeMetrics,
          after: paceMetricsFromStore(next),
          currencyCode: next.settings.currencyCode,
          enabled: true,
        });
      }
    },
    [persist],
  );

  const syncHouseholdNow = useCallback(async () => {
    const current = storeRef.current;
    if (!current.household || !isCloudSyncConfigured() || syncingRef.current) return;
    syncingRef.current = true;
    setSyncStatus('syncing');
    try {
      const remote = await cloudFetchById(current.household.id);
      if (remote) {
        await applyRemotePayload(remote, current.localMemberId);
        const after = storeRef.current;
        if (after.household) {
          // Only push when we are not behind — otherwise wait for the next pull.
          if (after.household.revision >= remote.revision) {
            await pushIfShared(after);
          }
        }
      } else {
        await pushIfShared(current);
      }
      setSyncStatus('idle');
      setSyncError(null);
    } catch (error) {
      setSyncStatus('error');
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      syncingRef.current = false;
    }
  }, [applyRemotePayload, pushIfShared]);

  syncHouseholdNowRef.current = syncHouseholdNow;

  useEffect(() => {
    loadStore().then((data) => {
      setStore(data);
      storeRef.current = data;
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready || !store.household || !isCloudSyncConfigured()) return;
    const householdId = store.household.id;

    void syncHouseholdNow();
    const timer = setInterval(() => void syncHouseholdNow(), HOUSEHOLD_POLL_MS);

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') void syncHouseholdNow();
    };
    const sub = AppState.addEventListener('change', onAppState);

    // Partner writes → pull immediately (fixes “only updates after restart”).
    const unsubscribeRealtime = subscribeHouseholdChanges(householdId, () => {
      void syncHouseholdNow();
    });

    return () => {
      clearInterval(timer);
      sub.remove();
      unsubscribeRealtime();
    };
  }, [ready, store.household?.id, syncHouseholdNow]);

  const activeCycle = useMemo(
    () => store.cycles.find((c) => c.isActive) ?? store.cycles[0] ?? null,
    [store.cycles],
  );

  const localMember = useMemo(() => {
    if (!store.household || !store.localMemberId) return null;
    return store.household.members.find((m) => m.id === store.localMemberId) ?? null;
  }, [store.household, store.localMemberId]);

  const snapshot = useMemo(
    () =>
      activeCycle
        ? calculateSafeSpend(activeCycle, new Date(), store.settings.weekStartsOn ?? 1)
        : {
            remainingUntilPayday: 0,
            safeToSpendToday: 0,
            todayAllowance: 0,
            spentToday: 0,
            safeToSpendThisWeek: 0,
            safeToSpendThisMonth: 0,
            daysLeftInWeek: 0,
            daysLeftInMonth: 0,
            weekShare: 0,
            monthShare: 0,
            daysUntilPayday: 0,
            totalDaysInCycle: 1,
            daysElapsed: 0,
            cycleProgress: 0,
            unpaidBillsTotal: 0,
            spentThisCycle: 0,
            reservedTotal: 0,
            isAtRisk: false,
            projectedShortfallDays: null,
            resourcesRemainingRatio: 0,
            trajectory: 'ON TARGET' as TrajectoryLabel,
            projectedEndBalance: 0,
          },
    [activeCycle, store.settings.weekStartsOn],
  );

  // Persist day lock so today's allowance stays stable across reloads / partners.
  useEffect(() => {
    if (!ready || !activeCycle) return;
    const today = toDateKey(new Date());
    if (activeCycle.dayPaceLock?.date === today) return;
    const lock = buildDayPaceLock(activeCycle, new Date());
    const current = storeRef.current;
    const cycle = current.cycles.find((c) => c.id === activeCycle.id);
    if (!cycle || cycle.dayPaceLock?.date === today) return;
    void commit({
      ...current,
      cycles: current.cycles.map((c) =>
        c.id === activeCycle.id ? withCycleTouch({ ...c, dayPaceLock: lock }) : c,
      ),
    });
  }, [ready, activeCycle, commit]);

  const attribution = useCallback(() => {
    const member = localMember;
    const name = member?.displayName || store.settings.displayName || undefined;
    return {
      memberId: member?.id,
      memberName: name,
      updatedAt: stamp(),
    };
  }, [localMember, store.settings.displayName]);

  const value: BudgetContextValue = {
    ready,
    store,
    activeCycle,
    snapshot,
    localMember,
    cloudSyncReady: isCloudSyncConfigured(),
    syncStatus,
    syncError,
    completeOnboarding: async (cycle) => {
      const withEnv = {
        ...cycle,
        envelopes: cycle.envelopes?.length ? cycle.envelopes : ensureEnvelopes(cycle),
        isActive: true,
      };
      await commit({
        ...store,
        settings: { ...store.settings, hasCompletedOnboarding: true },
        cycles: [withCycleTouch(withEnv)],
      });
    },
    updateSettings: async (patch) => {
      await commit({ ...store, settings: { ...store.settings, ...patch } });
    },
    updateActiveCycle: async (mutate) => {
      if (!activeCycle) return;
      const updated = withCycleTouch(mutate(activeCycle));
      await commit({
        ...store,
        cycles: store.cycles.map((c) => (c.id === updated.id ? updated : c)),
      });
    },
    addBill: async (bill) => {
      if (!activeCycle) return;
      const nextBill: Bill = {
        ...bill,
        id: bill.id ?? newId(),
        isRecurring: bill.isRecurring ?? false,
        isPaid: bill.isPaid ?? false,
        updatedAt: stamp(),
      };
      await commit({
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id
            ? withCycleTouch({ ...c, bills: [...c.bills, nextBill] })
            : c,
        ),
      });
    },
    updateBill: async (bill) => {
      if (!activeCycle) return;
      const nextBill = { ...bill, updatedAt: stamp() };
      await commit({
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id
            ? withCycleTouch({
                ...c,
                bills: c.bills.map((b) => (b.id === bill.id ? nextBill : b)),
              })
            : c,
        ),
      });
    },
    deleteBill: async (id) => {
      if (!activeCycle) return;
      await commit({
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id
            ? withCycleTouch({ ...c, bills: c.bills.filter((b) => b.id !== id) })
            : c,
        ),
      });
    },
    addExpense: async (expense) => {
      if (!activeCycle) return;
      const amount = Math.max(asMoney(expense.amount), 0);
      if (amount <= 0) return;
      const attr = attribution();
      const envelopeKey = expense.envelopeKey ?? categoryToEnvelopeKey(expense.category);
      const next: DailyExpense = {
        ...expense,
        ...attr,
        amount,
        envelopeKey,
        id: expense.id ?? newId(),
        date: expense.date ?? toDateKey(new Date()),
        updatedAt: stamp(),
      };
      await commit({
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id
            ? withCycleTouch({
                ...c,
                envelopes: ensureEnvelopes(c),
                expenses: [next, ...c.expenses],
              })
            : c,
        ),
      });
    },
    addExpenses: async (expenses) => {
      if (!activeCycle || expenses.length === 0) return;
      const attr = attribution();
      const nextItems: DailyExpense[] = expenses
        .map((expense) => {
          const amount = Math.max(asMoney(expense.amount), 0);
          if (amount <= 0) return null;
          return {
            ...expense,
            ...attr,
            amount,
            envelopeKey: expense.envelopeKey ?? categoryToEnvelopeKey(expense.category),
            id: expense.id ?? newId(),
            date: expense.date ?? toDateKey(new Date()),
            updatedAt: stamp(),
          } satisfies DailyExpense;
        })
        .filter(Boolean) as DailyExpense[];
      if (!nextItems.length) return;
      await commit({
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id
            ? withCycleTouch({ ...c, expenses: [...nextItems, ...c.expenses] })
            : c,
        ),
      });
    },
    importExpensesByDate: async (expenses) => {
      if (expenses.length === 0) return { cycleCount: 0, itemCount: 0 };
      const attr = attribution();
      const fallback = activeCycle ?? store.cycles[0] ?? null;
      const byCycle = new Map<string, DailyExpense[]>();

      for (const expense of expenses) {
        const amount = Math.max(asMoney(expense.amount), 0);
        if (amount <= 0) continue;
        const date = expense.date ?? toDateKey(new Date());
        const target = findCycleForDate(store.cycles, date, fallback);
        if (!target) continue;
        const next: DailyExpense = {
          ...expense,
          ...attr,
          amount,
          envelopeKey: expense.envelopeKey ?? categoryToEnvelopeKey(expense.category),
          id: expense.id ?? newId(),
          date,
          updatedAt: stamp(),
        };
        const list = byCycle.get(target.id) ?? [];
        list.push(next);
        byCycle.set(target.id, list);
      }

      if (!byCycle.size) return { cycleCount: 0, itemCount: 0 };

      let itemCount = 0;
      const cycles = store.cycles.map((c) => {
        const batch = byCycle.get(c.id);
        if (!batch?.length) return c;
        itemCount += batch.length;
        return withCycleTouch({
          ...c,
          envelopes: ensureEnvelopes(c),
          expenses: [...batch, ...c.expenses],
        });
      });

      await commit({ ...store, cycles });
      return { cycleCount: byCycle.size, itemCount };
    },
    deleteExpense: async (id) => {
      if (!activeCycle) return;
      await commit({
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id
            ? withCycleTouch({
                ...c,
                expenses: c.expenses.filter((e) => e.id !== id),
              })
            : c,
        ),
      });
    },
    replaceActiveCycle: async (cycle) => {
      const withEnv = {
        ...cycle,
        envelopes: cycle.envelopes?.length ? cycle.envelopes : ensureEnvelopes(cycle),
        isActive: true,
      };
      await commit({
        ...store,
        settings: { ...store.settings, hasCompletedOnboarding: true },
        cycles: [withCycleTouch(withEnv)],
      });
    },
    resetAll: async () => commit(emptyStore, { skipPush: true }),
    setPremium: async (enabled) => {
      await commit({ ...store, settings: { ...store.settings, isPremium: enabled } });
    },
    setEnvelopes: async (envelopes) => {
      if (!activeCycle) return;
      await commit({
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id ? withCycleTouch({ ...c, envelopes }) : c,
        ),
      });
    },
    addCustomCategory: async (title) => {
      if (!store.settings.isPremium) {
        throw new Error('Custom categories are a Plus feature.');
      }
      const trimmed = title.trim();
      if (!trimmed) throw new Error('Enter a category name.');
      const existing = store.settings.customCategories ?? [];
      if (existing.some((c) => c.title.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error('That category already exists.');
      }
      const custom = { id: `c_${newId()}`, title: trimmed };
      const envelopes = activeCycle
        ? [...ensureEnvelopes(activeCycle), makeCustomEnvelope(custom)]
        : [];
      await commit({
        ...store,
        settings: {
          ...store.settings,
          customCategories: [...existing, custom],
        },
        cycles: activeCycle
          ? store.cycles.map((c) =>
              c.id === activeCycle.id ? withCycleTouch({ ...c, envelopes }) : c,
            )
          : store.cycles,
      });
    },
    removeCustomCategory: async (id) => {
      const existing = store.settings.customCategories ?? [];
      await commit({
        ...store,
        settings: {
          ...store.settings,
          customCategories: existing.filter((c) => c.id !== id),
        },
        cycles: store.cycles.map((c) =>
          withCycleTouch({
            ...c,
            envelopes: (c.envelopes ?? []).filter((e) => e.key !== id && e.category !== id),
          }),
        ),
      });
    },
    createHousehold: async (displayName, householdName) => {
      const trimmed = displayName.trim();
      if (!trimmed) throw new Error('Enter your name');
      const deviceId = await getDeviceId();
      const memberId = newId();
      const now = stamp();
      const household: Household = {
        id: newId(),
        name: (householdName?.trim() || 'Our budget').slice(0, 40),
        inviteCode: generateInviteCode(),
        members: [
          {
            id: memberId,
            displayName: trimmed,
            deviceId,
            role: 'owner',
            joinedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
        revision: 1,
      };
      const next: AppStoreData = {
        ...store,
        settings: { ...store.settings, displayName: trimmed },
        household,
        localMemberId: memberId,
      };
      await commit(next);
      return household;
    },
    joinHousehold: async (inviteCode, displayName) => {
      const trimmed = displayName.trim();
      const code = normalizeInviteCode(inviteCode);
      if (!trimmed) throw new Error('Enter your name');
      if (code.length < 4) throw new Error('Enter the invite code');
      if (!isCloudSyncConfigured()) {
        throw new Error(
          'Cloud sync isn’t set up yet. Add your Supabase keys (see SHARED-BUDGET.md), then rebuild.',
        );
      }
      const remote = await cloudFetchByInviteCode(code);
      if (!remote) throw new Error('That code wasn’t found. Double-check it with your partner.');
      const deviceId = await getDeviceId();
      const existingOnDevice = remote.household.members.find((m) => m.deviceId === deviceId);
      if (!existingOnDevice && remote.household.members.length >= 2) {
        throw new Error('This shared budget already has two people.');
      }
      let memberId = existingOnDevice?.id;
      let members = [...remote.household.members];
      if (!memberId) {
        memberId = newId();
        members = [
          ...members,
          {
            id: memberId,
            displayName: trimmed,
            deviceId,
            role: 'partner',
            joinedAt: stamp(),
          },
        ];
      } else {
        members = members.map((m) =>
          m.id === memberId ? { ...m, displayName: trimmed } : m,
        );
      }
      const household: Household = {
        ...remote.household,
        members,
        updatedAt: stamp(),
        revision: remote.revision + 1,
      };
      const next: AppStoreData = {
        ...store,
        settings: {
          ...store.settings,
          displayName: trimmed,
          currencyCode: remote.settings.currencyCode || store.settings.currencyCode,
          hasCompletedOnboarding: true,
        },
        household,
        localMemberId: memberId,
        cycles: remote.cycles.length
          ? remote.cycles
          : store.cycles,
      };
      await persist(next);
      await cloudUpsertPayload(
        toSharedPayload({
          household,
          currencyCode: next.settings.currencyCode,
          cycles: next.cycles,
          customCategories: next.settings.customCategories,
        }),
      );
      return household;
    },
    leaveHousehold: async () => {
      await commit(
        {
          ...store,
          household: null,
          localMemberId: null,
        },
        { skipPush: true },
      );
    },
    renameLocalMember: async (displayName) => {
      const trimmed = displayName.trim();
      if (!trimmed || !store.household || !store.localMemberId) return;
      const household: Household = {
        ...store.household,
        members: store.household.members.map((m) =>
          m.id === store.localMemberId ? { ...m, displayName: trimmed } : m,
        ),
        updatedAt: stamp(),
      };
      await commit({
        ...store,
        settings: { ...store.settings, displayName: trimmed },
        household,
      });
    },
    syncHouseholdNow,
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider');
  return ctx;
}
