# STATUS — ffxiv-deep-dungeon-tracker-webapp

Built and committed: 2026-11-06

## What was built

An offline, zero-dependency, single-file webapp (`index.html`) for tracking FFXIV deep dungeon runs
(Palace of the Dead / PotD, Heaven-on-High / HoH, Eureka Orthos / Evo). Pure HTML/CSS/JS, works from
`file://`, all data stored in the browser's localStorage. No secrets, no network calls, no personal
data collected.

Features:

- **Runs tab** — new-run creation (dungeon + valid start floor), one-click "Arrived at floor N"
  logging, per-floor KO (death) counters, per-floor "died here" note fields, run end/delete, run
  summaries (deepest floor, KO total, duration).
- **Personal Bests tab** — computed from saved runs: deepest floor per dungeon and fastest
  start-to-checkpoint times for every 10-floor milestone; entry floors of mid-floorset runs are
  excluded as records.
- **Quick Reference tab** — per-dungeon cards for all pomanders/protomanders (verified effects +
  short tactical tips from public sources), floor enchantment events (Gloom, Item Penalty,
  Knockback Penalty, Magicite/Demiclone penalties, positive effects), and trap hazards.
- **Next-Run Checklist tab** — editable, resettable pre-run checklist per dungeon, saved per dungeon.

## How to run it

Open `index.html` in any modern browser (double-click works; `file://` is fully supported).
Optional test run: `node tests/test.js` (Node 18+, no dependencies).

## Verification results

- `node tests/test.js` — **16 passed, 0 failed** (framework-free `assert`-based suite in
  `tests/test.js`).
  - Pure-logic tests (floor + best-run math): milestone floors for all three dungeons, floorset
    math, run creation validation, next-floor-to-log progression, max-floor stop, copy/pure
    semantics of `logFloor`/`logDeath`, `runStats` aggregation.
  - Best-run math: fastest-checkpoint selection across competing runs, mid-floorset entry floors
    not counting as records, tie stability, dungeon isolation, empty-input safety.
  - Utility: `formatDuration`, `escapeHtml`.
  - Smoke test: both inline scripts are extracted from `index.html`, syntax-checked via
    `vm.Script`, and the full page (logic + UI IIFE) boots against a minimal DOM/localStorage stub
    with simulated click/change/input events.
- Exact LICENSE copyright line present: "Copyright (c) 2026 Asdale Dynamics, LLC".
- Confirmed no non-distribution data or secrets in files; only UI-text punctuation is non-ASCII
  (em-dashes, middle dots).

## Known gaps

- Timings rely on wall-clock "when you clicked" logging; if you start a run and log floors hours
  later, elapsed times reflect that reality. There is no manual time entry.
- Pomander inventory is not tracked card-by-card (counts/effects are shown as reference, not
  tracked per run).
- PotD 101+ solo-challenge entry (start floor 101) is selectable, but score-based ranking and
  "The Path No one Has Walked"-style achievements are not modeled.
- Reference data is hand-verified against public sources (official Lodestone guides, Gamer Escape
  wiki, Deep Dungeon Compendium) at build time; Square Enix can change numbers in future patches.
- No import/export of localStorage data yet; switching browsers means copying your history over
  manually (localStorage is per-browser).
- No automated browser (headless) test; the smoke test uses a DOM stub instead of a real browser.

## Files

- `index.html` — the whole app (UI, styles, pure logic marked `PURE-LOGIC-START/END` for testing).
- `tests/test.js` — dependency-free test suite + DOM-stub smoke test.
- `README.md` — usage, features, authorship credit (Asdale Dynamics, LLC).
- `LICENSE` — MIT, Copyright (c) 2026 Asdale Dynamics, LLC.
