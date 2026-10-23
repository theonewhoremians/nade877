# Analytics Studio

A responsive recreation of the TikTok video-analysis interface in the supplied recording. Includes editable Overview metrics, Viewers demographics, thumbnail replacement, a clean view, local project saving, and JSON import/export.

## Access

Access codes are verified by this project's Supabase Edge Functions. Codes bind to one device on first activation, and the admin page can create, search, enable, disable, extend, and reset licenses. Session tokens use HttpOnly cookies and refresh in the background. The admin key is entered for each session and is never saved by the page.

## Supabase setup

Create or select a Supabase project, then sign in with `supabase login` and link it with `supabase link --project-ref YOUR_PROJECT_REF`. Apply the schema with `supabase db push`, set the function secrets below, and deploy the six functions listed in `supabase/config.toml`:

```powershell
supabase secrets set LICENSE_JWT_SECRET="<32+ random characters>" LICENSE_ADMIN_KEY="<long random key>" ALLOWED_ORIGIN="https://your-app.example"
supabase functions deploy activate-license
supabase functions deploy refresh-license
supabase functions deploy license-status
supabase functions deploy create-license
supabase functions deploy reset-device
supabase functions deploy manage-license
```

Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env.local` from the project's API settings. These app values are public; the service-role key, JWT secret, and admin key belong only in Supabase secrets.

## Data

Analytics are editable sample data reproduced from the reference, not live TikTok data. Edits and thumbnails save only in this browser. Export JSON for backups or transfer to another device. Gender and age distributions must total 100 percent.

## Development

Node 22.13 or newer. Run npm run install:ci, npm run dev, and npm run build. Development uses localhost:5173.
