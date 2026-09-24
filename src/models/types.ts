export type PaySchedule =
  | 'monthly'
  | 'twiceMonthly'
  | 'everyTwoWeeks'
  | 'weekly'
  | 'custom';

/** Built-in category ids. Custom categories use ids like `c_<uuid>`. */
export type BuiltinCategory =
  | 'home'
  | 'groceries'
  | 'food'
  | 'transport'
  | 'shopping'
  | 'kids'
  | 'health'
  | 'fun'
  | 'travel'
  | 'subscriptions'
  | 'other';

/** Expense category id — builtin or custom. */
export type ExpenseCategory = BuiltinCategory | (string & {});

/** Envelope key — builtin category keys or custom category id. */
export type EnvelopeKey =
  | BuiltinCategory
  | (string & {});

export interface CustomCategory {
  id: string;
  title: string;
}

export interface Envelope {
  id: string;
  key: EnvelopeKey;
  title: string;
  category: ExpenseCategory;
  allocated: number;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  category?: ExpenseCategory;
  isRecurring: boolean;
  isPaid: boolean;
  updatedAt?: string;
}

export interface DailyExpense {
  id: string;
  name: string;
  amount: number;
  date: string;
  category?: ExpenseCategory;
  envelopeKey?: EnvelopeKey;
  memberId?: string;
  memberName?: string;
  updatedAt?: string;
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
  envelopes: Envelope[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  /**
   * Locked daily allowance for a calendar day.
   * Today stays predictable; future days adapt from leftover.
   */
  dayPaceLock?: {
    date: string;
    allowance: number;
  };
}

export type HouseholdMemberRole = 'owner' | 'partner';

export interface HouseholdMember {
  id: string;
  displayName: string;
  deviceId: string;
  role: HouseholdMemberRole;
  joinedAt: string;
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  members: HouseholdMember[];
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface AppSettings {
  hasCompletedOnboarding: boolean;
  currencyCode: string;
  notificationsEnabled: boolean;
  morningReminderEnabled: boolean;
  billRemindersEnabled: boolean;
  paceWarningsEnabled: boolean;
  isPremium: boolean;
  displayName: string;
  /** Week start: 0=Sun … 6=Sat (date-fns). Default Monday = 1. */
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Show remaining for today, the current calendar week, or until payday. */
  paceHorizon: 'day' | 'week' | 'month';
  /** User-defined categories (Plus). */
  customCategories: CustomCategory[];
  /** Successful free-tier receipt photo scans (capped by FREE_RECEIPT_SCAN_LIMIT). */
  freeReceiptScansUsed: number;
}

export interface AppStoreData {
  settings: AppSettings;
  cycles: PayCycle[];
  household: Household | null;
  localMemberId: string | null;
}

export interface SharedHouseholdPayload {
  household: Household;
  settings: Pick<AppSettings, 'currencyCode' | 'customCategories'>;
  cycles: PayCycle[];
  revision: number;
  updatedAt: string;
}

export type TrajectoryLabel = 'WITH RESERVE' | 'ON TARGET' | 'LOW RESERVE' | 'DEFICIT';

export interface SafeSpendSnapshot {
  remainingUntilPayday: number;
  /** Remaining of today's locked daily allowance (after today's spend). */
  safeToSpendToday: number;
  /** Locked allowance for today (does not shrink with spend — only remaining does). */
  todayAllowance: number;
  /** Spend recorded on today's date key. */
  spentToday: number;
  /** Remaining allowance for the current calendar week (weekStartsOn → +6). */
  safeToSpendThisWeek: number;
  /** Remaining allowance until next payday (pay-cycle window, not calendar month). */
  safeToSpendThisMonth: number;
  /** Days left in the current week, capped by days until payday. */
  daysLeftInWeek: number;
  /** Days left until payday (same as daysUntilPayday when > 0, else 1). */
  daysLeftInMonth: number;
  /**
   * Share of the remaining cycle that belongs to the selected horizon window
   * (daysLeftInPeriod / daysToCover). Categories multiply remaining by this.
   * Month/until-payday share is always 1.
   */
  weekShare: number;
  monthShare: number;
  daysUntilPayday: number;
  totalDaysInCycle: number;
  daysElapsed: number;
  cycleProgress: number;
  unpaidBillsTotal: number;
  spentThisCycle: number;
  reservedTotal: number;
  isAtRisk: boolean;
  projectedShortfallDays: number | null;
  resourcesRemainingRatio: number;
  trajectory: TrajectoryLabel;
  projectedEndBalance: number;
}

export const defaultSettings: AppSettings = {
  hasCompletedOnboarding: false,
  currencyCode: 'USD',
  notificationsEnabled: false,
  morningReminderEnabled: true,
  billRemindersEnabled: true,
  paceWarningsEnabled: true,
  isPremium: false,
  displayName: '',
  weekStartsOn: 1,
  paceHorizon: 'week',
  customCategories: [],
  freeReceiptScansUsed: 0,
};

export const emptyStore: AppStoreData = {
  settings: defaultSettings,
  cycles: [],
  household: null,
  localMemberId: null,
};
