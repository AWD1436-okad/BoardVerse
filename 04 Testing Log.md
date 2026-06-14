# Testing Log

## 2026-06-14 - Initial Final Answer Inspection

Checks run:
- Inspected project files and package setup.
- Inspected existing project memory files.
- Inspected Vercel project link.
- Checked Vercel production deployment for `playsgrid.org`.
- Checked Vercel environment variables.
- Checked HTTPS response for `https://playsgrid.org`.
- Checked `https://www.playsgrid.org` redirect.

Results:
- Existing stack is Next.js 16, React 19, TypeScript, Tailwind CSS, ESLint, npm, Supabase packages, and Vercel.
- Production deployment is Ready.
- `https://playsgrid.org` returns HTTP 200.
- `https://www.playsgrid.org` returns 308 redirect to `https://playsgrid.org/`.
- Vercel environment variable list is empty.
- Current live app is still the old PlayGrid placeholder and must be replaced.

Follow-up checks after memory-file update:
- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - passed.

## 2026-06-14 - Milestone 1 Final Answer Foundation

Checks run:
- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - passed.

Local browser tests at `http://127.0.0.1:3000`:
- Page title is `Final Answer | Private Quiz Game`.
- Final Answer landing page renders.
- Create Account button is clickable and shows its Milestone 2 placeholder explanation.
- Log In button is clickable and shows its Milestone 2 placeholder explanation.
- Create Room button is clickable and shows its Milestone 3 placeholder explanation.
- Join Room button is clickable and shows its Milestone 3 placeholder explanation.
- Fastest Finger preview and prize ladder are visible.
- Desktop browser console errors: none found.
- Mobile viewport check at 390 x 844 has no horizontal overflow.

Known limits:
- Buttons are intentional placeholders until accounts and rooms are implemented.
- No Supabase setup was added in this milestone.

Production verification:
- Vercel production deployment completed successfully.
- `https://playsgrid.org` returns HTTP 200.
- `https://www.playsgrid.org` redirects to `https://playsgrid.org/`.
- Production browser title is `Final Answer | Private Quiz Game`.
- Production browser check found Final Answer content, main buttons, Fastest Finger preview, and prize ladder.
- Production Join Room placeholder interaction works.
- Production browser console errors: none found.

## 2026-06-14 - Milestone 2 Account Code

Checks run:
- `npm.cmd run typecheck` - passed after tightening validation helper return types.
- `npm.cmd run lint` - passed after removing unnecessary manual memoization.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - first attempt hit a Windows/OneDrive generated-file lock on `.next/server/app/api`.
- Removed the generated `.next` folder and reran `npx.cmd next build` - passed.

Build result:
- Production build includes dynamic account routes:
  - `/api/account/signup`
  - `/api/account/login`
  - `/api/account/logout`
  - `/api/account/session`
  - `/api/account/profile`

Local browser tests at `http://127.0.0.1:3000`:
- Final Answer account UI renders.
- Create Account form is visible.
- Invalid PIN is blocked with `PIN must be exactly 4 digits.`
- Valid signup attempt shows Supabase setup-required message because env vars are not configured yet.
- Login panel opens.
- Setup-required message lists missing Supabase environment variables.
- Mobile viewport check at 390 x 844 has no horizontal overflow.
- Browser console errors: none found.

Not fully testable yet:
- Real create account.
- Duplicate username blocking.
- Login with correct PIN.
- Wrong PIN against a real account.
- Failed-attempt lockout.
- Logout after real session creation.
- Profile persistence.

Reason:
- Supabase database tables and Vercel environment variables are not configured yet.

Production verification:
- Vercel production deployment completed successfully.
- `https://playsgrid.org` returns HTTP 200.
- `https://www.playsgrid.org` redirects to `https://playsgrid.org/`.
- Production browser title is `Final Answer | Private Quiz Game`.
- Production browser shows Create Account, Log In, Username, Display name, and 4-digit PIN UI.
- Production signup attempt shows Supabase setup-required message.
- Production browser console errors: none found.

## 2026-06-14 - Supabase Setup Progress

Actions completed:
- Restored existing Supabase project `chhdhlmnlocxwgqdqfip`.
- Verified the database responds to SQL.
- Applied `supabase/final-answer-account-schema.sql`.
- Verified these tables exist:
  - `accounts`
  - `account_stats`
  - `account_login_attempts`
  - `account_sessions`
- Verified RLS is enabled on all four tables.
- Added `NEXT_PUBLIC_SUPABASE_URL` to Vercel production.

Still required:
- Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to Vercel.
- Add `SUPABASE_SECRET_KEY` to Vercel.
- Redeploy production.
- Test real signup, duplicate username, wrong PIN, lockout, login, logout, and profile/stats.

Reason not fully complete:
- The Supabase connector does not expose publishable or secret key values.
- Secret values should not be pasted into chat.
