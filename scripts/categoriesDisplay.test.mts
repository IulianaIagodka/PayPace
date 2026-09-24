/**
 * Default categories + display filter (spent or allocated).
 * Run: npm run test:categories
 */
import assert from 'node:assert/strict';
import {
  BUILTIN_CATEGORIES,
  categoryTitle,
  normalizeCategory,
  shouldShowCategory,
} from '../src/services/categories.ts';

function assertEq<T>(actual: T, expected: T, msg: string) {
  assert.equal(actual, expected, msg);
}

assertEq(
  BUILTIN_CATEGORIES.join('·'),
  'home·groceries·food·transport·shopping·kids·health·fun·travel·subscriptions·other',
  'default order',
);
assertEq(categoryTitle('food'), 'Eating out', 'food label');
assertEq(categoryTitle('home'), 'Home', 'home label');
assertEq(categoryTitle('shopping'), 'Shopping', 'shopping label');
assertEq(categoryTitle('health'), 'Health', 'health label');
assertEq(categoryTitle('fun'), 'Fun', 'fun label');
assertEq(categoryTitle('travel'), 'Travel', 'travel label');
assertEq(normalizeCategory('rent'), 'home', 'legacy rent → home');
assertEq(normalizeCategory('utilities'), 'home', 'legacy utilities → home');
assertEq(normalizeCategory('childcare'), 'kids', 'legacy childcare → kids');
assertEq(normalizeCategory('loan'), 'other', 'legacy loan → other');
assertEq(shouldShowCategory(0, 0), false, 'hide empty');
assertEq(shouldShowCategory(10, 0), true, 'show spent');
assertEq(shouldShowCategory(0, 50), true, 'show allocated');

console.log('categoriesDisplay.test.mts: ok');
