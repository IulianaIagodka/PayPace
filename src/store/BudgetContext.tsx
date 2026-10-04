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
import { buildDayPaceLock, calculateSafeSpend, effectiveCycleStartDate } from '../models/calculator';
import {
  emptyStore,
  type AppSettings,
  type AppStoreData,
  type Bill,
  type DailyExpense,
  type ExpenseScope,
  type Household,
  type HouseholdActivityEvent,
  type HouseholdMember,
  type PayCycle,
  type PeriodReport,
  type SafeSpendSnapshot,
  type SharedHouseholdPayload,
  type TrajectoryLabel,
} from '../models/types';
import { loadStore, saveStore } from '../services/persistence';
import { asMoney, toDateKey } from '../services/formatting';
import { findCycleForDate } from '../services/cycleMatching';
import { getDeviceId } from '../services/deviceIdentity';
import { generateInviteCode, normalizeInviteCode } from '../services/inviteCode';
import {
  findExistingHouseholdMember,
  HOUSEHOLD_FULL_RECLAIM_HINT,
} from '../services/householdJoin';
import {
  balanceChangedSummary,
  billAddedSummary,
  billDeletedSummary,
  billUpdatedSummary,
  buildActivityEvent,
  expenseAddedSummary,
  expenseDeletedSummary,
} from '../services/householdActivity';
import {
  mergeSharedPayloads,
  toSharedPayload,
  trimActivityEvents,
} from '../services/householdMerge';
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
import { freeReceiptScansUsed } from '../services/receiptScanQuota';
import {
  collectNewPeriodReports,
  dismissReportPromptFlag,
  markReportViewed,
  mergePeriodReports,
  nextAwaitingPromptReport,
} from '../services/periodReports';

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
  /** Newest unread period report waiting for View / Later prompt. */
  pendingReportPrompt: PeriodReport | null;
  dismissReportPrompt: (opts?: { view?: boolean }) => void;
  markPeriodReportViewed: (reportId: string) => Promise<void>;
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
  /** Remove every expense logged on the given date key (YYYY-MM-DD) in the active cycle. */
  deleteExpensesByDate: (date: string) => Promise<void>;
  replaceActiveCycle: (cycle: PayCycle) => Promise<void>;
  resetAll: () => Promise<void>;
  setPremium: (enabled: boolean) => Promise<void>;
  /** Count one free-tier receipt scan after a successful photo analyze. No-op for Plus. */
  recordReceiptScan: () => Promise<void>;
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

function appendActivity(
  store: AppStoreData,
  events: HouseholdActivityEvent | HouseholdActivityEvent[],
): AppStoreData {
  if (!store.household) return store;
  const batch = Array.isArray(events) ? events : [events];
  if (!batch.length) return store;
  return {
    ...store,
    activityEvents: trimActivityEvents([...batch, ...(store.activityEvents ?? [])]),
  };
}

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<AppStoreData>(emptyStore);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingReportPrompt, setPendingReportPrompt] = useState<PeriodReport | null>(null);
  const storeRef = useRef(store);
  storeRef.current = store;
  const syncingRef = useRef(false);
  const syncHouseholdNowRef = useRef<(() => Promise<void>) | null>(null);
  const reportCheckBusyRef = useRef(false);

  const persist = useCallback(async (next: AppStoreData, opts?: { allowEmpty?: boolean }) => {
    const wrote = await saveStore(next, opts);
    if (!wrote) {
      // Empty overwrite blocked — keep the in-memory budget that is still on disk.
      return false;
    }
    setStore(next);
    storeRef.current = next;
    return true;
  }, []);

  const pushIfShared = useCallback(async (next: AppStoreData) => {
    if (!next.household || !isCloudSyncConfigured()) return 'disabled' as const;
    const payload = toSharedPayload({
      household: next.household,
      currencyCode: next.settings.currencyCode,
      cycles: next.cycles,
      customCategories: next.settings.customCategories,
      activityEvents: next.activityEvents,
    });
    return cloudUpsertPayload(payload);
  }, []);

  const commit = useCallback(
    async (next: AppStoreData, opts?: { skipPush?: boolean; allowEmpty?: boolean }) => {
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
      const wrote = await persist(payload, { allowEmpty: opts?.allowEmpty });
      if (!wrote) return;
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
        activityEvents: current.activityEvents,
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
        activityEvents: merged.activityEvents ?? [],
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

  const [todayKey, setTodayKey] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    const refreshToday = () => {
      const next = toDateKey(new Date());
      setTodayKey((prev) => (prev === next ? prev : next));
    };
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') refreshToday();
    };
    const sub = AppState.addEventListener('change', onAppState);
    const timer = setInterval(refreshToday, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

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
            spentThisWeek: 0,
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
    [activeCycle, store.settings.weekStartsOn, todayKey],
  );

  // Persist day lock so today's allowance stays stable across reloads / partners.
  // Also rewrite a stuck 0-lock once the spend pool becomes positive (balance set later).
  useEffect(() => {
    if (!ready || !activeCycle) return;
    const lock = buildDayPaceLock(activeCycle, new Date());
    const current = storeRef.current;
    const cycle = current.cycles.find((c) => c.id === activeCycle.id);
    if (!cycle) return;
    const existing = cycle.dayPaceLock;
    const unchanged =
      existing?.date === lock.date &&
      existing.allowance === lock.allowance;
    if (unchanged) return;
    void commit({
      ...current,
      cycles: current.cycles.map((c) =>
        c.id === activeCycle.id ? withCycleTouch({ ...c, dayPaceLock: lock }) : c,
      ),
    });
  }, [ready, activeCycle, commit, todayKey]);

  // Heal startDate: pull back after a “today” reset, or clamp a start that was
  // stretched too far by a full statement import (Day N of 50+).
  useEffect(() => {
    if (!ready || !activeCycle) return;
    const current = storeRef.current;
    const cycle = current.cycles.find((c) => c.id === activeCycle.id);
    if (!cycle) return;
    const healed = effectiveCycleStartDate(cycle);
    if (healed === cycle.startDate.slice(0, 10)) return;
    void commit({
      ...current,
      cycles: current.cycles.map((c) =>
        c.id === activeCycle.id ? withCycleTouch({ ...c, startDate: healed }) : c,
      ),
    });
  }, [ready, activeCycle, commit, todayKey]);

  const refreshPeriodReports = useCallback(async () => {
    if (reportCheckBusyRef.current) return;
    const current = storeRef.current;
    if (!current.settings.hasCompletedOnboarding) return;
    reportCheckBusyRef.current = true;
    try {
      const created = collectNewPeriodReports({
        cycles: current.cycles,
        existing: current.periodReports ?? [],
        customCategories: current.settings.customCategories,
        weekStartsOn: current.settings.weekStartsOn ?? 1,
      });
      let periodReports = current.periodReports ?? [];
      if (created.length > 0) {
        periodReports = mergePeriodReports(periodReports, created);
        await persist({ ...current, periodReports });
      }
      const awaiting = nextAwaitingPromptReport(periodReports);
      if (awaiting) setPendingReportPrompt(awaiting);
    } finally {
      reportCheckBusyRef.current = false;
    }
  }, [persist]);

  useEffect(() => {
    if (!ready) return;
    void refreshPeriodReports();
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') void refreshPeriodReports();
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [ready, refreshPeriodReports]);

  const attribution = useCallback(() => {
    const member = localMember;
    const name = member?.displayName || store.settings.displayName || undefined;
    return {
      memberId: member?.id,
      memberName: name,
      updatedAt: stamp(),
    };
  }, [localMember, store.settings.displayName]);

  const actor = useCallback(() => {
    const attr = attribution();
    return { memberId: attr.memberId, memberName: attr.memberName };
  }, [attribution]);

  const value: BudgetContextValue = {
    ready,
    store,
    activeCycle,
    snapshot,
    localMember,
    cloudSyncReady: isCloudSyncConfigured(),
    syncStatus,
    syncError,
    pendingReportPrompt,
    dismissReportPrompt: (opts) => {
      const report = pendingReportPrompt;
      setPendingReportPrompt(null);
      if (!report) return;
      const current = storeRef.current;
      // View opens PeriodReport screen (marks viewed there); Later only clears the prompt.
      const periodReports = opts?.view
        ? markReportViewed(current.periodReports ?? [], report.id)
        : dismissReportPromptFlag(current.periodReports ?? [], report.id);
      void persist({ ...current, periodReports }).then(() => {
        const next = nextAwaitingPromptReport(periodReports);
        if (next) setPendingReportPrompt(next);
      });
    },
    markPeriodReportViewed: async (reportId) => {
      const current = storeRef.current;
      const periodReports = markReportViewed(current.periodReports ?? [], reportId);
      await persist({ ...current, periodReports });
    },
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
      const beforeBalance = asMoney(activeCycle.currentBalance);
      const updated = withCycleTouch(mutate(activeCycle));
      const afterBalance = asMoney(updated.currentBalance);
      let nextStore: AppStoreData = {
        ...store,
        cycles: store.cycles.map((c) => (c.id === updated.id ? updated : c)),
      };
      if (store.household && afterBalance !== beforeBalance) {
        const who = actor();
        nextStore = appendActivity(
          nextStore,
          buildActivityEvent({
            kind: 'balance_changed',
            ...who,
            beforeAmount: beforeBalance,
            afterAmount: afterBalance,
            amount: afterBalance,
            summary: balanceChangedSummary(
              beforeBalance,
              afterBalance,
              store.settings.currencyCode,
              who.memberName,
            ),
          }),
        );
      }
      await commit(nextStore);
    },
    addBill: async (bill) => {
      if (!activeCycle) return;
      const who = actor();
      const nextBill: Bill = {
        ...bill,
        id: bill.id ?? newId(),
        isRecurring: bill.isRecurring ?? false,
        isPaid: bill.isPaid ?? false,
        memberId: bill.memberId ?? who.memberId,
        memberName: bill.memberName ?? who.memberName,
        updatedAt: stamp(),
      };
      let nextStore: AppStoreData = {
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id
            ? withCycleTouch({ ...c, bills: [...c.bills, nextBill] })
            : c,
        ),
      };
      nextStore = appendActivity(
        nextStore,
        buildActivityEvent({
          kind: 'bill_added',
          ...who,
          billId: nextBill.id,
          amount: asMoney(nextBill.amount),
          summary: billAddedSummary(
            nextBill.name,
            nextBill.amount,
            store.settings.currencyCode,
            who.memberName,
          ),
        }),
      );
      await commit(nextStore);
    },
    updateBill: async (bill) => {
      if (!activeCycle) return;
      const who = actor();
      const prev = activeCycle.bills.find((b) => b.id === bill.id);
      const nextBill = {
        ...bill,
        memberId: bill.memberId ?? who.memberId,
        memberName: bill.memberName ?? who.memberName,
        updatedAt: stamp(),
      };
      let nextStore: AppStoreData = {
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id
            ? withCycleTouch({
                ...c,
                bills: c.bills.map((b) => (b.id === bill.id ? nextBill : b)),
              })
            : c,
        ),
      };
      nextStore = appendActivity(
        nextStore,
        buildActivityEvent({
          kind: 'bill_updated',
          ...who,
          billId: nextBill.id,
          amount: asMoney(nextBill.amount),
          summary: billUpdatedSummary(
            nextBill.name,
            nextBill.amount,
            store.settings.currencyCode,
            who.memberName,
            Boolean(nextBill.isPaid && !prev?.isPaid),
          ),
        }),
      );
      await commit(nextStore);
    },
    deleteBill: async (id) => {
      if (!activeCycle) return;
      const who = actor();
      const removed = activeCycle.bills.find((b) => b.id === id);
      let nextStore: AppStoreData = {
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id
            ? withCycleTouch({ ...c, bills: c.bills.filter((b) => b.id !== id) })
            : c,
        ),
      };
      if (removed) {
        nextStore = appendActivity(
          nextStore,
          buildActivityEvent({
            kind: 'bill_deleted',
            ...who,
            billId: removed.id,
            amount: asMoney(removed.amount),
            summary: billDeletedSummary(
              removed.name,
              removed.amount,
              store.settings.currencyCode,
              who.memberName,
            ),
          }),
        );
      }
      await commit(nextStore);
    },
    addExpense: async (expense) => {
      if (!activeCycle) return;
      const amount = Math.max(asMoney(expense.amount), 0);
      if (amount <= 0) return;
      const attr = attribution();
      const scope: ExpenseScope = expense.scope === 'personal' ? 'personal' : 'shared';
      const envelopeKey = expense.envelopeKey ?? categoryToEnvelopeKey(expense.category);
      const next: DailyExpense = {
        ...expense,
        ...attr,
        scope,
        amount,
        envelopeKey,
        id: expense.id ?? newId(),
        date: expense.date ?? toDateKey(new Date()),
        updatedAt: stamp(),
      };
      let nextStore: AppStoreData = {
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
      };
      nextStore = appendActivity(
        nextStore,
        buildActivityEvent({
          kind: 'expense_added',
          memberId: next.memberId,
          memberName: next.memberName,
          expenseId: next.id,
          amount: next.amount,
          scope: next.scope,
          summary: expenseAddedSummary(
            next.name,
            next.amount,
            store.settings.currencyCode,
            next.memberName,
            next.scope,
          ),
        }),
      );
      await commit(nextStore);
    },
    addExpenses: async (expenses) => {
      if (!activeCycle || expenses.length === 0) return;
      const attr = attribution();
      const nextItems: DailyExpense[] = expenses
        .map((expense) => {
          const amount = Math.max(asMoney(expense.amount), 0);
          if (amount <= 0) return null;
          const scope: ExpenseScope = expense.scope === 'personal' ? 'personal' : 'shared';
          return {
            ...expense,
            ...attr,
            scope,
            amount,
            envelopeKey: expense.envelopeKey ?? categoryToEnvelopeKey(expense.category),
            id: expense.id ?? newId(),
            date: expense.date ?? toDateKey(new Date()),
            updatedAt: stamp(),
          } satisfies DailyExpense;
        })
        .filter(Boolean) as DailyExpense[];
      if (!nextItems.length) return;
      let nextStore: AppStoreData = {
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id
            ? withCycleTouch({ ...c, expenses: [...nextItems, ...c.expenses] })
            : c,
        ),
      };
      nextStore = appendActivity(
        nextStore,
        nextItems.map((item) =>
          buildActivityEvent({
            kind: 'expense_added',
            memberId: item.memberId,
            memberName: item.memberName,
            expenseId: item.id,
            amount: item.amount,
            scope: item.scope,
            summary: expenseAddedSummary(
              item.name,
              item.amount,
              store.settings.currencyCode,
              item.memberName,
              item.scope,
            ),
          }),
        ),
      );
      await commit(nextStore);
    },
    importExpensesByDate: async (expenses) => {
      if (expenses.length === 0) return { cycleCount: 0, itemCount: 0 };
      const attr = attribution();
      const fallback = activeCycle ?? store.cycles[0] ?? null;
      const byCycle = new Map<string, DailyExpense[]>();
      const created: DailyExpense[] = [];

      for (const expense of expenses) {
        const amount = Math.max(asMoney(expense.amount), 0);
        if (amount <= 0) continue;
        const date = expense.date ?? toDateKey(new Date());
        const target = findCycleForDate(store.cycles, date, fallback);
        if (!target) continue;
        const scope: ExpenseScope = expense.scope === 'personal' ? 'personal' : 'shared';
        const next: DailyExpense = {
          ...expense,
          ...attr,
          scope,
          amount,
          envelopeKey: expense.envelopeKey ?? categoryToEnvelopeKey(expense.category),
          id: expense.id ?? newId(),
          date,
          updatedAt: stamp(),
        };
        const list = byCycle.get(target.id) ?? [];
        list.push(next);
        byCycle.set(target.id, list);
        created.push(next);
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

      let nextStore: AppStoreData = { ...store, cycles };
      nextStore = appendActivity(
        nextStore,
        created.map((item) =>
          buildActivityEvent({
            kind: 'expense_added',
            memberId: item.memberId,
            memberName: item.memberName,
            expenseId: item.id,
            amount: item.amount,
            scope: item.scope,
            summary: expenseAddedSummary(
              item.name,
              item.amount,
              store.settings.currencyCode,
              item.memberName,
              item.scope,
            ),
          }),
        ),
      );
      await commit(nextStore);
      return { cycleCount: byCycle.size, itemCount };
    },
    deleteExpense: async (id) => {
      if (!activeCycle) return;
      const who = actor();
      const removed = activeCycle.expenses.find((e) => e.id === id);
      let nextStore: AppStoreData = {
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id
            ? withCycleTouch({
                ...c,
                expenses: c.expenses.filter((e) => e.id !== id),
              })
            : c,
        ),
      };
      if (removed) {
        nextStore = appendActivity(
          nextStore,
          buildActivityEvent({
            kind: 'expense_deleted',
            ...who,
            expenseId: removed.id,
            amount: asMoney(removed.amount),
            scope: removed.scope === 'personal' ? 'personal' : 'shared',
            summary: expenseDeletedSummary(
              removed.name,
              removed.amount,
              store.settings.currencyCode,
              who.memberName,
            ),
          }),
        );
      }
      await commit(nextStore);
    },
    deleteExpensesByDate: async (date) => {
      if (!activeCycle) return;
      const who = actor();
      const removed = activeCycle.expenses.filter((e) => e.date === date);
      let nextStore: AppStoreData = {
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id
            ? withCycleTouch({
                ...c,
                expenses: c.expenses.filter((e) => e.date !== date),
              })
            : c,
        ),
      };
      nextStore = appendActivity(
        nextStore,
        removed.map((item) =>
          buildActivityEvent({
            kind: 'expense_deleted',
            ...who,
            expenseId: item.id,
            amount: asMoney(item.amount),
            scope: item.scope === 'personal' ? 'personal' : 'shared',
            summary: expenseDeletedSummary(
              item.name,
              item.amount,
              store.settings.currencyCode,
              who.memberName,
            ),
          }),
        ),
      );
      await commit(nextStore);
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
    resetAll: async () => commit(emptyStore, { skipPush: true, allowEmpty: true }),
    setPremium: async (enabled) => {
      // Never persist Plus onto a blank shell — that used to overwrite a real budget
      // after a corrupt/failed load returned freshStore().
      if (!store.settings.hasCompletedOnboarding && !store.cycles.length) return;
      await commit({ ...store, settings: { ...store.settings, isPremium: enabled } });
    },
    recordReceiptScan: async () => {
      if (store.settings.isPremium) return;
      await commit({
        ...store,
        settings: {
          ...store.settings,
          freeReceiptScansUsed: freeReceiptScansUsed(store.settings) + 1,
        },
      });
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
      if (!store.settings.isPremium) {
        throw new Error('Shared budget is a Plus feature.');
      }
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
        activityEvents: store.activityEvents ?? [],
      };
      await commit(next);
      return household;
    },
    joinHousehold: async (inviteCode, displayName) => {
      if (!store.settings.isPremium) {
        throw new Error('Shared budget is a Plus feature.');
      }
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
      const existingMember = findExistingHouseholdMember(
        remote.household.members,
        deviceId,
        trimmed,
      );
      if (!existingMember && remote.household.members.length >= 2) {
        throw new Error(HOUSEHOLD_FULL_RECLAIM_HINT);
      }
      let memberId = existingMember?.id;
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
        // Reclaim seat after reinstall / data wipe: bind this phone to the old member.
        members = members.map((m) =>
          m.id === memberId ? { ...m, displayName: trimmed, deviceId } : m,
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
          customCategories:
            remote.settings.customCategories ?? store.settings.customCategories ?? [],
          hasCompletedOnboarding: true,
        },
        household,
        localMemberId: memberId,
        cycles: remote.cycles.length ? remote.cycles : store.cycles,
        activityEvents: remote.activityEvents ?? [],
      };
      await persist(next);
      await cloudUpsertPayload(
        toSharedPayload({
          household,
          currencyCode: next.settings.currencyCode,
          cycles: next.cycles,
          customCategories: next.settings.customCategories,
          activityEvents: next.activityEvents,
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
          activityEvents: [],
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
