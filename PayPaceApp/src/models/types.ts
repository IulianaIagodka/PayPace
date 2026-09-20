export type PaySchedule =
  | 'monthly'
  | 'twiceMonthly'
  | 'everyTwoWeeks'
  | 'weekly'
  | 'custom';

export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'subscriptions'
  | 'loan'
  | 'childcare'
  | 'groceries'
  | 'transport'
  | 'food'
  | 'other';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // ISO
  category?: ExpenseCategory;
  isRecurring: boolean;
  isPaid: boolean;
}

export interface DailyExpense {
  id: string;
  name: string;
  amount: number;
  date: string; // ISO
  category?: ExpenseCategory;
}

export interface PayCycle {
  id: string;
  schedule: PaySchedule;
  startDate: string;
  nextPayday: string;
  currentBalance: number;
  expectedPaycheck: number;
  savingsGoal: number;
  emergencyBuffer: number;
  spendingBuffer: number;
  bills: Bill[];
  expenses: DailyExpense[];
  isActive: boolean;
  createdAt: string;
}

export interface AppSettings {
  hasCompletedOnboarding: boolean;
  currencyCode: string;
  notificationsEnabled: boolean;
  morningReminderEnabled: boolean;
  billRemindersEnabled: boolean;
  paceWarningsEnabled: boolean;
  isPremium: boolean;
}

export interface AppStoreData {
  settings: AppSettings;
  cycles: PayCycle[];
}

export interface SafeSpendSnapshot {
  remainingUntilPayday: number;
  safeToSpendToday: number;
  daysUntilPayday: number;
  totalDaysInCycle: number;
  daysElapsed: number;
  cycleProgress: number;
  unpaidBillsTotal: number;
  spentThisCycle: number;
  reservedTotal: number;
  isAtRisk: boolean;
  projectedShortfallDays: number | null;
}

export const defaultSettings: AppSettings = {
  hasCompletedOnboarding: false,
  currencyCode: 'UAH',
  notificationsEnabled: false,
  morningReminderEnabled: true,
  billRemindersEnabled: true,
  paceWarningsEnabled: true,
  isPremium: false,
};

export const emptyStore: AppStoreData = {
  settings: defaultSettings,
  cycles: [],
};
