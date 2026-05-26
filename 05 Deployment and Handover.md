# Deployment and Handover

## Product Summary

BoardVerse is a browser-based online board-game platform for casual realtime play with friends, rooms, spectators, bots, safe chat, reports, admin tools, and match rewards.

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
- Production deployment `dpl_9ubyE9koqkQjdatskZB5BK1i5vW4` is Ready.
- Verified production URL: `https://boardverse-bice.vercel.app`.

Domain note:
- `profitplanet.win` is currently attached to another Vercel project named `tradex`.
- `profitplanet.win` also shows a nameserver mismatch in Vercel, with Cloudflare nameservers active instead of Vercel nameservers.
- BoardVerse was not assigned to `profitplanet.win` because moving an existing production domain away from another project can break that public site.

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
- Full production deployment.
