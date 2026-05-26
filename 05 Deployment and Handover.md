# Deployment and Handover

## Product Summary

PlayGrid is a browser-based online board-game platform for casual realtime play with friends, rooms, spectators, bots, safe chat, reports, admin tools, and match rewards.

Brand note: BoardVerse was the old working name. PlayGrid is now the public product name.

## How To Run Locally

1. Install dependencies with `npm.cmd install`.
2. Start local development with `npm.cmd run dev`.
3. Open the local URL shown by Next.js.

## Required Environment Variables

These are expected later when Supabase is connected:
- `NEXT_PUBLIC_SUPABASE_URL`: public Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: browser-safe Supabase publishable key.
- Server-only Supabase/admin secrets may be needed for protected admin operations and must never be exposed in browser code.

## Data Storage

MVP data will be stored in Supabase Postgres with Row Level Security.

## Deployment Plan

The target host is Vercel. The standard flow will be:
1. Commit code to Git.
2. Push to GitHub `main`.
3. Let Vercel build and deploy.
4. Verify the production deployment is Ready.
5. Browser-check the live public link.

Current deployment status:
- Local app is working.
- GitHub remote is `https://github.com/AWD1436-okad/BoardVerse.git`.
- Vercel project is linked as `boardverse`.
- Production deployment is Ready.
- Current verified Vercel URL: `https://boardverse-bice.vercel.app`.
- Target public domain: `playsgrid.org`.
- Secondary domain: `www.playsgrid.org`.
- Latest production deployment ID: `dpl_9habiEpVKQBkxoDtpr5JDG7CcrFy`.

Domain note:
- `playsgrid.org` and `www.playsgrid.org` have been added to the Vercel project.
- Vercel says the DNS is not configured yet.
- Current nameservers are Cloudflare: `ashley.ns.cloudflare.com` and `camilo.ns.cloudflare.com`.
- Safest DNS setup in Cloudflare:
  1. Add or update an `A` record for `playsgrid.org` pointing to `76.76.21.21`.
  2. Add or update an `A` record for `www.playsgrid.org` pointing to `76.76.21.21`, as requested by Vercel CLI.
  3. Keep proxy off if Vercel verification does not complete with proxy on.
- `www.playsgrid.org` is configured in `vercel.json` to redirect permanently to `https://playsgrid.org`.
- After DNS changes, Vercel will verify the domains and send an email when complete.

Plain-English DNS steps for the owner:
1. Open Cloudflare and select the `playsgrid.org` domain.
2. Go to DNS.
3. Add or edit the root record:
   - Type: `A`
   - Name: `@`
   - IPv4 address: `76.76.21.21`
4. Add or edit the www record:
   - Type: `A`
   - Name: `www`
   - IPv4 address: `76.76.21.21`
5. If Vercel verification does not complete, turn Cloudflare proxy off for these records by setting them to DNS only.
6. Return to Vercel project settings, open Domains, and wait until both domains show valid/ready.

## Backups and Rollback

Code rollback should use Git and Vercel deployment history. Database rollback requires Supabase backups and reviewed migrations.

## Common Problems

- PowerShell may block `npm` or `npx` scripts. Use `npm.cmd` and `npx.cmd`.
- Missing Supabase environment variables will block connected auth/data features.
- Vercel deployment needs project linking and account access before production verification can be completed.

## Still Optional or Unfinished

- Supabase project setup.
- Auth and profile implementation.
- Room and game implementation.
- Admin dashboard.
- Custom domain DNS verification for `playsgrid.org` and `www.playsgrid.org`.
