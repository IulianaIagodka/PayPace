# Legacy shared-budget migration runbook (staging first)

## Why this cannot be automatic
Legacy members have a local deviceId and a displayName, neither is proof of ownership. The existing invite code was readable through anonymous Supabase SELECT. Binding a new Apple identity based on any of these values enables account takeover.

## Safe staged migration
1. Back up `public.households` and validate restore on a separate Supabase staging project.
2. Disable legacy writes in the staging test client; do not touch production RLS.
3. Obtain a verified Apple/Supabase `auth.users.id` for each existing household member.
4. Independently verify that person's ownership using an out-of-band process. A name, invite code, device ID or screenshot alone is insufficient.
5. A trusted operator (service role, never bundled in the app) calls `bind_verified_legacy_member` with household UUID, user UUID, role, and verification reference.
6. Confirm audit entries, two-seat maximum, and authorized read. Verify anonymous and unrelated-user reads/writes are denied.
7. Only then switch that household's client to authenticated transport; check ledger totals and IDs before and after.
8. Keep backups and a documented rollback procedure. Roll back client rollout separately from database policy changes.

## Not yet production-ready
- The secure RPC join flow does not yet update the JSON member list with the newly authenticated partner.
- The existing BudgetContext sync still calls legacy cloud functions.
- Secure migration cannot run until user-identity mapping is verified.
- The package lock and iOS build must be validated.
- **Never set EXPO_PUBLIC_SECURE_SHARED_BUDGET=true in a production build at this stage.**
