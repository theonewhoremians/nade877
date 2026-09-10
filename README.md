# Analytics Studio

A responsive recreation of the TikTok video-analysis interface in the supplied recording. Includes editable Overview metrics, Viewers demographics, thumbnail replacement, a clean view, local project saving, and JSON import/export.

## Access

Uses the existing Edit Flow Supabase license functions. Activate with an existing access code. Licenses are device-bound, so a code already used on another origin may need a device reset from the admin panel. The admin page uses the existing Edit Flow admin key and manages the same license records. The key is kept only in memory and never saved.

License sessions use HttpOnly cookies and are verified by the existing server before rendering the editor. The editor rechecks every minute and before saving. Licensing secrets remain on the existing Supabase backend. Only its public endpoint and publishable key are included here.

## Data

Analytics are editable sample data reproduced from the reference, not live TikTok data. Edits and thumbnails save only in this browser. Export JSON for backups or transfer to another device. Gender and age distributions must total 100 percent.

## Development

Node 22.13 or newer. Run npm run install:ci, npm run dev, and npm run build. Development uses localhost:5173.

## Verification

TypeScript and the production build pass. HTTP checks verified that missing sessions, malformed codes and unauthorized admin requests are rejected. The live Edit Flow backend rejects a deliberately invalid access code. Successful activation and admin mutations require the owner's real credentials and were not exercised. Browser interaction QA and WebMCP runtime validation were not performed.
