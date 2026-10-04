/**
 * Household join / reclaim helpers.
 * Run: npm run test:join
 */
import assert from 'node:assert/strict';
import {
  findExistingHouseholdMember,
  HOUSEHOLD_FULL_RECLAIM_HINT,
} from '../src/services/householdJoin.ts';
import type { HouseholdMember } from '../src/models/types.ts';

const members: HouseholdMember[] = [
  {
    id: 'm1',
    displayName: 'Ira',
    deviceId: 'dev-ira',
    role: 'owner',
    joinedAt: '2026-01-01',
  },
  {
    id: 'm2',
    displayName: 'Sasha',
    deviceId: 'dev-sasha',
    role: 'partner',
    joinedAt: '2026-01-02',
  },
];

assert.equal(findExistingHouseholdMember(members, 'dev-ira', 'Other')?.id, 'm1', 'by device');
assert.equal(findExistingHouseholdMember(members, 'new-phone', 'Ira')?.id, 'm1', 'by name');
assert.equal(findExistingHouseholdMember(members, 'new-phone', ' ira ')?.id, 'm1', 'name trim/case');
assert.equal(findExistingHouseholdMember(members, 'new-phone', 'Other'), undefined, 'no match');
assert.ok(HOUSEHOLD_FULL_RECLAIM_HINT.includes('SAME name'), 'hint mentions same name');

console.log('householdJoin.test.mts: ok');
