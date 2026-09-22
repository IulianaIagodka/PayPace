import type { BuiltinCategory, CustomCategory, ExpenseCategory } from '../models/types';

export const CATEGORY_META: Record<
  BuiltinCategory,
  { title: string; titleUk: string; keywords: string[] }
> = {
  rent: { title: 'Rent', titleUk: 'Оренда', keywords: ['rent', 'оренда', 'квартира'] },
  utilities: {
    title: 'Utilities',
    titleUk: 'Комуналка',
    keywords: ['electric', 'water', 'gas', 'utility', 'світло', 'вода', 'газ', 'комунал'],
  },
  subscriptions: {
    title: 'Subscriptions',
    titleUk: 'Підписки',
    keywords: ['netflix', 'spotify', 'youtube', 'apple', 'subscription', 'підписк'],
  },
  loan: { title: 'Loan', titleUk: 'Кредит', keywords: ['loan', 'кредит', 'розстроч'] },
  childcare: {
    title: 'Childcare',
    titleUk: 'Діти',
    keywords: ['child', 'school', 'садок', 'школа', 'дитин'],
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
      'м\'ясо',
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
  transport: {
    title: 'Transport',
    titleUk: 'Транспорт',
    keywords: ['uber', 'bolt', 'taxi', 'bus', 'metro', 'fuel', 'petrol', 'бензин', 'проїзд', 'транспорт'],
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
  other: { title: 'Other', titleUk: 'Інше', keywords: [] },
};

export const BUILTIN_CATEGORIES: BuiltinCategory[] = [
  'groceries',
  'food',
  'transport',
  'subscriptions',
  'utilities',
  'childcare',
  'rent',
  'loan',
  'other',
];

/** @deprecated use BUILTIN_CATEGORIES — kept for older call sites */
export const SPENDING_CATEGORIES = BUILTIN_CATEGORIES;

export function isBuiltinCategory(value: string): value is BuiltinCategory {
  return (BUILTIN_CATEGORIES as string[]).includes(value);
}

export function allCategoryIds(custom: CustomCategory[] = []): ExpenseCategory[] {
  const customIds = custom.map((c) => c.id);
  // Keep "other" last; insert customs before it.
  const builtins = BUILTIN_CATEGORIES.filter((c) => c !== 'other');
  return [...builtins, ...customIds, 'other'];
}

export function categoryTitle(
  category: ExpenseCategory,
  opts?: { uk?: boolean; custom?: CustomCategory[] },
): string {
  const uk = opts?.uk === true;
  const custom = opts?.custom ?? [];
  if (isBuiltinCategory(category)) {
    return uk ? CATEGORY_META[category].titleUk : CATEGORY_META[category].title;
  }
  const hit = custom.find((c) => c.id === category);
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
  const idx = list.indexOf(current);
  if (idx < 0) return list[0] ?? 'other';
  return list[(idx + 1) % list.length] ?? 'other';
}
