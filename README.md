# Deep Dungeon Tracker (FFXIV: PotD, HoH, Evo)

An offline, zero-dependency, single-file webapp for tracking **Final Fantasy XIV deep dungeon runs**:
the **Palace of the Dead (PotD)**, **Heaven-on-High (HoH)**, and **Eureka Orthos (Evo)**. Built warm,
simple, and beginner-friendly by **Asdale Dynamics, LLC**.

Everything runs locally. No installs, no servers, no accounts, no telemetry. All your data lives in
your own browser's localStorage and never leaves your device.

## What it does

- **Runs tab** — Start a run (choose dungeon + start floor), then log each floor as you reach it with
  one button. Per-floor **KO counter** and a **"died here"** note field (trap? jailbreaking? which
  floor beat you?) saved right on that floor's row. End or delete runs; ended runs keep their history.
- **Personal Bests tab** — Automatically computed from your runs: your **deepest floor ever** per
  dungeon, plus your **fastest time from run start to each 10-floor checkpoint** (every deep-dungeon
  boss/set floor). Entry floors of mid-floorset runs don't count as records.
- **Quick Reference tab** — Fast cards for every **pomander** (protomanders in Evo) with verified
  effects and a one-line tactician's tip, plus **floor enchantment events** (Gloom, Item Penalty,
  Knockback Penalty, and friends) and **traps** (Land Mine, Toading, Luring, and more) per dungeon.
- **Next-Run Checklist tab** — A gentle, ADHD-friendly pre-run checklist per dungeon. Tick, edit,
  add, or reset-to-defaults; it saves itself automatically.

## How to run it

1. Download (or clone) this folder.
2. Double-click `index.html`, or open it with your browser (`file://` works fine).
3. That's it. Your notes and bests persist in that browser's localStorage.

Optional: run the test suite with Node (Node 18+ recommended, no packages to install):

```bash
node tests/test.js
```

## Guidelines you can trust

Accuracy notes for the reference cards were compiled from public resources, including Square Enix's
official Lodestone deep-dungeon guides, Gamer Escape's wiki, and the Deep Dungeon Compendium. The
app is a fan-made tracker: FFXIV, the Palace of the Dead, Heaven-on-High, and Eureka Orthos are the
property of Square Enix Co., Ltd. This project is not affiliated with or endorsed by Square Enix.

## About the author

This tool is published by **Asdale Dynamics, LLC** — the company behind Dylan Asdale's friendly,
plain-English AI guides (see *The Massive AI Manual* and dylanasdale.github.io). The LLC builds
beginner-friendly AI education and practical, local-first tools that respect your privacy.

## Related tools

- `ffxiv-eureka-bozja-tracker-webapp` — field operations tracker for The Forbidden Land, Eureka and
  Zadnor/Bozja sorts. Pair it with this one and you have outdoor meta and deep dungeons covered.

## MIT License

Copyright (c) 2026 Asdale Dynamics, LLC. See [LICENSE](LICENSE).
