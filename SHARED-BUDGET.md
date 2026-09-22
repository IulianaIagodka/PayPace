# Shared budget (Plus)

PayPace can sync one household budget between two phones (you + partner). **Shared budget is a Plus feature.**

## How it works

1. Unlock Plus (Settings → **TRY PLUS (DEMO)** for now)
2. One person opens **Settings → Shared budget → Create**
3. Shares the invite code
4. Partner opens **Join**, enters name + code
5. Both see the same balance, payday, bills, and spending
6. Each expense is tagged with who logged it

Sync needs a free [Supabase](https://supabase.com) project (a few minutes).

While the app is open, partner edits arrive via **Supabase Realtime**. There is also a light background reconcile about **every 20 minutes**, plus a pull when the app comes to the foreground (and **Sync now**).

## Setup (once)

1. Create a Supabase project
2. **SQL Editor** → paste and run the contents of `supabase/schema.sql` (not the file path)
3. **Project Settings → API** → copy **Project URL** and **anon public** key
4. Put them in a gitignored `.env` (preferred):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Or as EAS **production** env vars / secrets (required for cloud builds from the phone):

```bash
npx eas-cli env:update EXPO_PUBLIC_SUPABASE_URL --value https://... --type string
npx eas-cli env:update EXPO_PUBLIC_SUPABASE_ANON_KEY --value eyJ... --type string
```

You can also place empty placeholders in `app.json` → `expo.extra` (`supabaseUrl`, `supabaseAnonKey`) and fill them via env at build time — never commit real keys.

5. Rebuild the app so the keys are baked in (`npm run build:ios:local:submit` on Mac, or cloud EAS)

6. If the project already existed before Realtime sync: Supabase → **Database → Replication** → enable `households`, or re-run the Realtime line from `supabase/schema.sql`.

Without keys you can still create a household on one phone and name both people, but the phones will not sync until Supabase is configured.
