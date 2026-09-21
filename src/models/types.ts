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

export type EnvelopeKey = 'food' | 'transport' | 'kids' | 'fun' | 'home' | 'other';

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
  /** Show remaining for the current calendar week or month (categories follow). */
  paceHorizon: 'week' | 'month';
}

export interface AppStoreData {
  settings: AppSettings;
  cycles: PayCycle[];
  household: Household | null;
  localMemberId: string | null;
}

export interface SharedHouseholdPayload {
  household: Household;
  settings: Pick<AppSettings, 'currencyCode'>;
  cycles: PayCycle[];
  revision: number;
  updatedAt: string;
}

export type TrajectoryLabel = 'WITH RESERVE' | 'ON TARGET' | 'LOW RESERVE' | 'DEFICIT';

export interface SafeSpendSnapshot {
  remainingUntilPayday: number;
  safeToSpendToday: number;
  /** Remaining allowance for the current calendar week (weekStartsOn → +6). */
  safeToSpendThisWeek: number;
  /** Remaining allowance for the current calendar month. */
  safeToSpendThisMonth: number;
  /** Days left in the current week, capped by days until payday. */
  daysLeftInWeek: number;
  /** Days left in the current month, capped by days until payday. */
  daysLeftInMonth: number;
  /**
   * Share of the remaining cycle that belongs to the selected horizon window
   * (daysLeftInPeriod / daysToCover). Categories multiply remaining by this.
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
  currencyCode: 'PLN',
  notificationsEnabled: false,
  morningReminderEnabled: true,
  billRemindersEnabled: true,
  paceWarningsEnabled: true,
  isPremium: false,
  displayName: '',
  weekStartsOn: 1,
  paceHorizon: 'week',
};

export const emptyStore: AppStoreData = {
  settings: defaultSettings,
  cycles: [],
  household: null,
  localMemberId: null,
};
