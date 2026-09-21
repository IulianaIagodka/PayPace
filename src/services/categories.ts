import type { ExpenseCategory } from '../models/types';

export const CATEGORY_META: Record<
  ExpenseCategory,
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
    title: 'Food & drink',
    titleUk: 'Їжа поза домом',
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
      'кава',
      'американо',
      'лате',
      'капучино',
      'кафе',
      'ресторан',
      'піца',
      'обід',
      'макдональдс',
      'mcdonald',
    ],
  },
  other: { title: 'Other', titleUk: 'Інше', keywords: [] },
};

export const SPENDING_CATEGORIES: ExpenseCategory[] = [
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

export function categoryTitle(category: ExpenseCategory, uk = true): string {
  return uk ? CATEGORY_META[category].titleUk : CATEGORY_META[category].title;
}

export function guessCategory(name: string): ExpenseCategory {
  const lower = name.toLowerCase();
  for (const category of SPENDING_CATEGORIES) {
    if (category === 'other') continue;
    if (CATEGORY_META[category].keywords.some((k) => lower.includes(k))) {
      return category;
    }
  }
  return 'other';
}
