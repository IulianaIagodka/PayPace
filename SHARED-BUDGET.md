# Shared budget (пара)

PayPace can sync one household budget between two phones (you + partner).

## How it works

1. One person opens **Settings → Shared budget → Create**
2. Shares the invite code
3. Partner opens **Join with code**, enters name + code
4. Both see the same balance, payday, bills, and spending
5. Each expense is tagged with who logged it

Sync needs a free [Supabase](https://supabase.com) project (2 minutes).

## Setup (once)

1. Create a Supabase project
2. SQL Editor → paste and run `supabase/schema.sql`
3. Project Settings → API → copy **Project URL** and **anon public** key
4. Put them in `app.json` → `expo.extra`:

```json
"supabaseUrl": "https://YOUR_PROJECT.supabase.co",
"supabaseAnonKey": "YOUR_ANON_KEY"
```

Or as EAS secrets / env:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

5. Rebuild the app (EAS / Xcode) so the keys are baked in

Without keys, you can still create a household locally and name both people, but phones will not sync until Supabase is configured.
