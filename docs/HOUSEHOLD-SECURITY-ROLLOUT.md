# Household security rollout (NOT READY TO DEPLOY)

## Current risk
The existing `supabase/schema.sql` grants anonymous clients SELECT/INSERT/UPDATE on every household. Invite codes are not database authorization. This exposes financial budget data to unauthorized API clients.

## Staged in this branch
`supabase/migrations/20261011_household_members_rls.sql` introduces an authenticated `household_members` relation and member-scoped read/update RLS. **Do not execute this migration yet**: existing clients have no Supabase Auth session and would lose sync; existing households also have no member rows.

## Required before production rollout
1. Add Supabase Auth sign-in (prefer persistent device-safe session + account recovery) and use authenticated client tokens, not only the public anon key.
2. Implement SECURITY DEFINER RPCs for atomic household creation, code redemption, and member removal. Check `auth.uid()`, lock household row during joins, cap membership at two, and do not expose invite codes to nonmembers.
3. Backfill legacy households safely after verifying ownership. Existing `deviceId` / display name are not proof of ownership. Do not assign users to historical financial records by name alone.
4. Update `householdCloud.ts`, `BudgetContext.tsx`, `SharedBudgetScreen.tsx` to use auth + membership RPCs. Add login/recovery, revoked-member behavior, and migration UX.
5. Test two members can sync; a third cannot join; strangers cannot read/update or subscribe; old clients fail safely; concurrent join race; owner recovery; invite-code rotation; stale revision conflict.
6. Only after app deployment and migration/backfill, run the SQL migration and verify Supabase RLS and Realtime policies. Review any direct grants and RPC execute privileges.

**Do not merge this branch as a finished security fix.** The SQL is staged infrastructure, not a completed authentication rollout.
