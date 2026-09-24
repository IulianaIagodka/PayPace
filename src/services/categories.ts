import type { BuiltinCategory, CustomCategory, ExpenseCategory } from '../models/types';

export const CATEGORY_META: Record<
  BuiltinCategory,
  { title: string; titleUk: string; keywords: string[] }
> = {
  home: {
    title: 'Home',
    titleUk: 'Дім',
    keywords: [
      'rent',
      'оренда',
      'квартира',
      'electric',
      'water',
      'gas',
      'utility',
      'світло',
      'вода',
      'газ',
      'комунал',
      'ikea',
      'home depot',
      'leroy',
    ],
  },
  groceries: {
    title: 'Groceries',
    titleUk: 'Продукти',
    keywords: [
      'milk',
      'bread',
      'egg',
      'cheese',
      'meat',
      'fruit',
      'veg',
      'banana',
      'молоко',
      'хліб',
      'сир',
      "м'ясо",
      'овоч',
      'фрукт',
      'банан',
      'яйц',
      'масло',
      'чай',
      'цукор',
      'рис',
      'греч',
      'колбас',
      'ковбас',
      'йогурт',
      'сметан',
      'silpo',
      'atb',
      'novus',
      'auchan',
      'biedronka',
      'żabka',
      'zabka',
      'grocery',
      'market',
    ],
  },
  food: {
    title: 'Eating out',
    titleUk: 'Їжа не вдома',
    keywords: [
      'coffee',
      'americano',
      'latte',
      'cappuccino',
      'cafe',
      'restaurant',
      'pizza',
      'burger',
      'sushi',
      'lunch',
      'dinner',
      'кава',
      'американо',
      'лате',
      'капучино',
      'кафе',
      'ресторан',
      'піца',
      'обід',
      'вечеря',
      'макдональдс',
      'mcdonald',
      'kfc',
      'starbucks',
    ],
  },
  transport: {
    title: 'Transport',
    titleUk: 'Транспорт',
    keywords: ['uber', 'bolt', 'taxi', 'bus', 'metro', 'fuel', 'petrol', 'бензин', 'проїзд', 'транспорт'],
  },
  shopping: {
    title: 'Shopping',
    titleUk: 'Шопінг',
    keywords: [
      'amazon',
      'zalando',
      'zara',
      'h&m',
      'hm ',
      'uniqlo',
      'mall',
      'clothes',
      'одеж',
      'взутт',
      'shoes',
      'shop',
    ],
  },
  kids: {
    title: 'Kids',
    titleUk: 'Діти',
    keywords: ['child', 'school', 'садок', 'школа', 'дитин', 'kids', 'toy', 'іграш'],
  },
  health: {
    title: 'Health',
    titleUk: 'Здоровʼя',
    keywords: [
      'pharmacy',
      'аптек',
      'doctor',
      'лікар',
      'clinic',
      'hospital',
      'dental',
      'dentist',
      'medicine',
      'вітам',
      'health',
    ],
  },
  fun: {
    title: 'Fun',
    titleUk: 'Розваги',
    keywords: [
      'cinema',
      'кино',
      'кіно',
      'game',
      'steam',
      'playstation',
      'concert',
      'party',
      'бар',
      'bar ',
      'club',
      'hobby',
    ],
  },
  travel: {
    title: 'Travel',
    titleUk: 'Подорожі',
    keywords: [
      'hotel',
      'booking',
      'airbnb',
      'flight',
      'airline',
      'ryanair',
      'wizz',
      'train',
      'pkp',
      'travel',
      'trip',
      'vacation',
      'турист',
    ],
  },
  subscriptions: {
    title: 'Subscriptions',
    titleUk: 'Підписки',
    keywords: ['netflix', 'spotify', 'youtube', 'apple', 'subscription', 'підписк'],
  },
  other: { title: 'Other', titleUk: 'Інше', keywords: [] },
};

/** Default builtins in display order. */
export const BUILTIN_CATEGORIES: BuiltinCategory[] = [
  'home',
  'groceries',
  'food',
  'transport',
  'shopping',
  'kids',
  'health',
  'fun',
  'travel',
  'subscriptions',
  'other',
];

/** Older ids still present in saved data → current builtins. */
const LEGACY_CATEGORY_MAP: Record<string, BuiltinCategory> = {
  rent: 'home',
  utilities: 'home',
  childcare: 'kids',
  loan: 'other',
};

/** @deprecated use BUILTIN_CATEGORIES — kept for older call sites */
export const SPENDING_CATEGORIES = BUILTIN_CATEGORIES;

export function isBuiltinCategory(value: string): value is BuiltinCategory {
  return (BUILTIN_CATEGORIES as string[]).includes(value);
}

/** Map legacy expense/envelope category ids onto the current set. */
export function normalizeCategory(category?: string | null): ExpenseCategory {
  if (!category) return 'other';
  if (LEGACY_CATEGORY_MAP[category]) return LEGACY_CATEGORY_MAP[category]!;
  if (isBuiltinCategory(category)) return category;
  return category;
}

export function allCategoryIds(custom: CustomCategory[] = []): ExpenseCategory[] {
  const customIds = custom.map((c) => c.id);
  const builtins = BUILTIN_CATEGORIES.filter((c) => c !== 'other');
  return [...builtins, ...customIds, 'other'];
}

export function categoryTitle(
  category: ExpenseCategory,
  opts?: { uk?: boolean; custom?: CustomCategory[] },
): string {
  const uk = opts?.uk === true;
  const custom = opts?.custom ?? [];
  const normalized = normalizeCategory(category);
  if (isBuiltinCategory(normalized)) {
    return uk ? CATEGORY_META[normalized].titleUk : CATEGORY_META[normalized].title;
  }
  const hit = custom.find((c) => c.id === category || c.id === normalized);
  return hit?.title ?? 'Custom';
}

export function guessCategory(name: string): ExpenseCategory {
  const lower = name.toLowerCase();
  for (const category of BUILTIN_CATEGORIES) {
    if (category === 'other') continue;
    if (CATEGORY_META[category].keywords.some((k) => lower.includes(k))) {
      return category;
    }
  }
  return 'other';
}

export function nextCategoryInCycle(
  current: ExpenseCategory,
  custom: CustomCategory[] = [],
): ExpenseCategory {
  const list = allCategoryIds(custom);
  const normalized = normalizeCategory(current);
  const idx = list.indexOf(normalized);
  if (idx < 0) return list[0] ?? 'other';
  return list[(idx + 1) % list.length] ?? 'other';
}

/** Lists / rails: show only spent or user-allocated categories. */
export function shouldShowCategory(spent: number, allocated: number): boolean {
  return spent > 0 || allocated > 0;
}
