# WorkTrackr — Round 2 dark redesign: integrated & verified

## What this package is
One folder: `src` — it goes into **`C:\repos\worktrackr-app\web\client\src\app\src\`** (overwrite when asked).
It contains Manus's round-2 frontend **plus** the leftover light screens finished off, all verified.
Your `docs/` and your entire backend are **not** in here and are **not** touched.

## What I did
- Brought in Manus's round-2 frontend (it darkened the ticket screens, quote detail/form, invoice
  detail, project form, company notes, contact manager, voice assistant, user management, and more).
- Finished the screens that were still light on the now-dark app, using **Manus's exact colours**
  (no redesign — only light→dark): New/Edit **Order** form, **Contract** form + contract list,
  **CSV Import**, **AI Quote Generator**, the **contact picker** inside the create-ticket popup, the
  leftover white patches on the **ticket detail** screen, plus several settings/modal odds and ends.
- Bumped the footer to **`Build 2026-06-26.dark-redesign-r2`** so you can confirm the deploy went live.

## What I checked (all passed)
- **Builds clean** — 1,846 modules, zero errors.
- **Backend + your docs**: byte-for-byte unchanged.
- **Every button/form still hits the same data** — no web address, method, or data call changed anywhere.
- **Money**: nothing hardcoded; every £ still comes from real data.
- **Role-gating**: untouched — engineers still can't see commission/profit/pay.
- **No invented data** — no fake progress bars, payslips, totals, or milestones; "New" still shows as "Suspect".
- **No buttons or actions lost** in any screen.

## Known-light, on purpose (not a problem)
- **Old Leads list** and its add/convert popups: these are **unreachable** — their tab was removed and
  nothing in the menus opens them. Users never see them, so I left them rather than touch dead code.
- The shared Sales frame keeps a light "fallback" path that nothing live uses anymore.
- A couple of cosmetic 1–2 colour leftovers Manus left in already-dark screens (harmless).
If you ever want these tidied too, it's a quick follow-up — just ask.

## How to get it live (GitHub Desktop)
1. Unzip this. Copy the `src` folder into `C:\repos\worktrackr-app\web\client\src\app\src\`,
   choosing **replace/overwrite** when Windows asks.
2. Open **GitHub Desktop**. You'll see the changed frontend files listed — and importantly, **no
   deleted docs and no backend changes**. (If you see docs or backend files listed as changed, stop
   and tell me.)
3. Summary box: e.g. *"Dark redesign round 2 — integrated + verified"*. Click **Commit to main**, then **Push origin**.
4. **Render auto-deploys** on push. Don't run any build yourself, and never build inside Render's shell.
5. A few minutes later, open the app and check the footer reads **Build 2026-06-26.dark-redesign-r2** —
   that confirms the new version is live.

## After it's confirmed live
Once you're happy, the last housekeeping step is running `cleanup-design-reference.ps1` (in your `docs/`)
to strip the ~124 MB of Manus reference images. I have **not** run it — do that only when you're settled.
