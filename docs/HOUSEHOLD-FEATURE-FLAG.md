# Secure Shared Budget feature flag

`EXPO_PUBLIC_SECURE_SHARED_BUDGET` is **false by default**. This is a build-time flag, not a server authorization control.

| Flag | Current behavior |
| --- | --- |
| unset / false | Existing legacy Create/Join and sync behavior unchanged. **Existing Supabase RLS remains insecure.** |
| true | Create/Join fail closed until secure auth + RPC + sync are implemented and tested. Do not enable in production. |

The flag does **not** make legacy data secure. It only isolates the incomplete replacement implementation from normal use.

## Release blockers
- Finish authenticated Create/Join client integration and persist Apple identity.
- Replace legacy anonymous fetch/upsert and Realtime with member-scoped access.
- Secure the server RPC payload: server must control membership and verify owner identity; do not trust client-provided members.
- Migrate existing household ownership through a verified claim flow, never a matching name.
- Review legacy invite codes (currently 6 chars) and rotate as appropriate.
- Align Expo Apple Authentication dependency with lockfile via `npx expo install expo-apple-authentication` and `npm install`.
- Run `npm ci`, `npm run typecheck`, `npm test`, and iOS/TestFlight integration tests.
- Apply SQL in a staging Supabase project first; production RLS only after successful migration and client rollout.

**Do not merge this PR as a completed security feature.** It is safe to merge only after the dependency/build checks and flag isolation are validated.
