# Authentication scope: Shared Budget only

Product decision: **Do not require an account for personal budgeting**.

- Personal onboarding, expense tracking, bills, reports, and offline/local budgeting remain anonymous and usable without Supabase Auth.
- Only entry points for Create Shared Budget and Join Shared Budget request Sign in with Apple.
- Restore the authenticated Supabase session on subsequent launches without prompting again.
- A failed/cancelled Apple sign-in must not block personal budgeting.
- The Plus entitlement is independent from Apple identity.
- The shared household must be created/joined through authenticated, atomic RPCs; the existing anonymous read/upsert path must be removed before claiming secure sharing.
- Existing shared households need verified migration; do not reclaim an owner's or partner's seat using display name or device ID alone.
- No login screen in general onboarding or app launch.
- Do not apply staged RLS to production before client migration and integration tests.

## Acceptance criteria
1. Fresh installation can complete personal onboarding and add expenses without login.
2. Opening Shared Budget prompts Apple sign-in only when attempting Create or Join.
3. Successful sign-in persists across restarts; no repeated prompts.
4. Cancelled sign-in leaves local budget usable.
5. Two distinct Apple identities can share one household; third identity cannot join.
6. Unrelated authenticated and anonymous clients cannot read, mutate, or subscribe to the household.
7. Legacy members can migrate without losing budget data; unverified name matches never claim seats.
