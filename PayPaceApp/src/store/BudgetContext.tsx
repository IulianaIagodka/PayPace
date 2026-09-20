import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { newId } from '../services/id';
import { calculateSafeSpend } from '../models/calculator';
import {
  emptyStore,
  type AppSettings,
  type AppStoreData,
  type Bill,
  type DailyExpense,
  type PayCycle,
  type SafeSpendSnapshot,
} from '../models/types';
import { loadStore, saveStore } from '../services/persistence';
import { asMoney, toDateKey } from '../services/formatting';

type BudgetContextValue = {
  ready: boolean;
  store: AppStoreData;
  activeCycle: PayCycle | null;
  snapshot: SafeSpendSnapshot;
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
  deleteExpense: (id: string) => Promise<void>;
  replaceActiveCycle: (cycle: PayCycle) => Promise<void>;
  resetAll: () => Promise<void>;
  setPremium: (enabled: boolean) => Promise<void>;
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<AppStoreData>(emptyStore);

  useEffect(() => {
    loadStore().then((data) => {
      setStore(data);
      setReady(true);
    });
  }, []);

  const commit = useCallback(async (next: AppStoreData) => {
    setStore(next);
    await saveStore(next);
  }, []);

  const activeCycle = useMemo(
    () => store.cycles.find((c) => c.isActive) ?? store.cycles[0] ?? null,
    [store.cycles],
  );

  const snapshot = useMemo(
    () =>
      activeCycle
        ? calculateSafeSpend(activeCycle)
        : {
            remainingUntilPayday: 0,
            safeToSpendToday: 0,
            daysUntilPayday: 0,
            totalDaysInCycle: 1,
            daysElapsed: 0,
            cycleProgress: 0,
            unpaidBillsTotal: 0,
            spentThisCycle: 0,
            reservedTotal: 0,
            isAtRisk: false,
            projectedShortfallDays: null,
          },
    [activeCycle],
  );

  const value: BudgetContextValue = {
    ready,
    store,
    activeCycle,
    snapshot,
    completeOnboarding: async (cycle) => {
      await commit({
        settings: { ...store.settings, hasCompletedOnboarding: true },
        cycles: [{ ...cycle, isActive: true }],
      });
    },
    updateSettings: async (patch) => {
      await commit({ ...store, settings: { ...store.settings, ...patch } });
    },
    updateActiveCycle: async (mutate) => {
      if (!activeCycle) return;
      const updated = mutate(activeCycle);
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
      };
      await commit({
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id ? { ...c, bills: [...c.bills, nextBill] } : c,
        ),
      });
    },
    updateBill: async (bill) => {
      if (!activeCycle) return;
      await commit({
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id
            ? { ...c, bills: c.bills.map((b) => (b.id === bill.id ? bill : b)) }
            : c,
        ),
      });
    },
    deleteBill: async (id) => {
      if (!activeCycle) return;
      await commit({
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id ? { ...c, bills: c.bills.filter((b) => b.id !== id) } : c,
        ),
      });
    },
    addExpense: async (expense) => {
      if (!activeCycle) return;
      const amount = Math.max(asMoney(expense.amount), 0);
      if (amount <= 0) return;
      const next: DailyExpense = {
        ...expense,
        amount,
        id: expense.id ?? newId(),
        date: expense.date ?? toDateKey(new Date()),
      };
      await commit({
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id ? { ...c, expenses: [next, ...c.expenses] } : c,
        ),
      });
    },
    addExpenses: async (expenses) => {
      if (!activeCycle || expenses.length === 0) return;
      const nextItems: DailyExpense[] = expenses
        .map((expense) => {
          const amount = Math.max(asMoney(expense.amount), 0);
          if (amount <= 0) return null;
          return {
            ...expense,
            amount,
            id: expense.id ?? newId(),
            date: expense.date ?? toDateKey(new Date()),
          } satisfies DailyExpense;
        })
        .filter(Boolean) as DailyExpense[];
      if (!nextItems.length) return;
      await commit({
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id
            ? { ...c, expenses: [...nextItems, ...c.expenses] }
            : c,
        ),
      });
    },
    deleteExpense: async (id) => {
      if (!activeCycle) return;
      await commit({
        ...store,
        cycles: store.cycles.map((c) =>
          c.id === activeCycle.id
            ? { ...c, expenses: c.expenses.filter((e) => e.id !== id) }
            : c,
        ),
      });
    },
    replaceActiveCycle: async (cycle) => {
      await commit({
        settings: { ...store.settings, hasCompletedOnboarding: true },
        cycles: [{ ...cycle, isActive: true }],
      });
    },
    resetAll: async () => commit(emptyStore),
    setPremium: async (enabled) => {
      await commit({ ...store, settings: { ...store.settings, isPremium: enabled } });
    },
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider');
  return ctx;
}
