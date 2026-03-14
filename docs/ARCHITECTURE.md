# Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Actions                           │
│                                                                 │
│  ┌─────────────────────┐     ┌────────────────────────────────┐ │
│  │  scrape-data.yml    │     │  deploy.yml                    │ │
│  │                     │     │                                │ │
│  │  Cron: Mon 06:00UTC │     │  On push to main               │ │
│  │  + Manual trigger   │     │                                │ │
│  │                     │     │  ┌──────┐  ┌─────┐            │ │
│  │  Python script      │     │  │ test │  │ e2e │  (parallel) │ │
│  │  ↓                  │     │  └──┬───┘  └──┬──┘            │ │
│  │  Fetch from F1      │     │     └────┬────┘               │ │
│  │  Fantasy API        │     │          ▼                    │ │
│  │  ↓                  │     │  ┌─────────────┐              │ │
│  │  Write JSON files   │     │  │    build    │              │ │
│  │  ↓                  │     │  └──────┬──────┘              │ │
│  │  git commit + push ─╋────►│         ▼                    │ │
│  │                     │     │  ┌─────────────┐              │ │
│  └─────────────────────┘     │  │   deploy    │              │ │
│                              │  │ GitHub Pages│              │ │
│                              │  └─────────────┘              │ │
│                              └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

          ┌──────────────────────────────────────────┐
          │          F1 Fantasy Feeds API             │
          │   fantasy.formula1.com/feeds/             │
          │                                          │
          │  /schedule/raceday_en.json  (race list)  │
          │  /drivers/{gameday}_en.json (scores)     │
          └──────────────────────────────────────────┘
                           │
                    Python script
                    fetches after
                    each race
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│                Static JSON Data                       │
│                public/data/2026/                      │
│                                                      │
│  season.json ─── Race calendar, driver/constructor   │
│                  lists, sprint flags                  │
│                                                      │
│  drivers/VER.json ─── Per-driver file                │
│  drivers/HAM.json     • abbreviation, name, team     │
│  drivers/NOR.json     • price, total points          │
│  ...                  • per-race breakdown            │
│                                                      │
│  constructors/RBR.json ─── Per-constructor file      │
│  constructors/FER.json     • abbreviation, name      │
│  ...                       • price, total points     │
│                            • per-race points         │
└──────────────────────────────────────────────────────┘
                           │
                    Loaded at runtime
                    via fetch() from
                    GitHub Pages CDN
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│              React Application (Client)               │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  App.tsx                                       │  │
│  │  Tab navigation: Prices | Drivers | Constr.    │  │
│  └────────────────────────────────────────────────┘  │
│           │              │              │            │
│           ▼              ▼              ▼            │
│  ┌──────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │ PricesTable  │ │DriversTable│ │Constructors  │  │
│  │              │ │            │ │    Table     │  │
│  │ Tier A / B   │ │ Per-race   │ │ Per-race     │  │
│  │ split tables │ │ points     │ │ points       │  │
│  │ Price change │ │ Expandable │ │              │  │
│  │ calculator   │ │ breakdown  │ │              │  │
│  └──────┬───────┘ └────────────┘ └──────────────┘  │
│         │                                           │
│         ▼                                           │
│  ┌────────────────────────────────────────────────┐  │
│  │  priceChange.ts (Business Logic)               │  │
│  │                                                │  │
│  │  AvgPPM = avg(last 3 races) / price            │  │
│  │  → Performance tier (great/good/poor/terrible) │  │
│  │  → Price tier (A: ≥18.5M / B: <18.5M)         │  │
│  │  → Expected price change                       │  │
│  │  → Points needed next race per threshold       │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  Shared                                        │  │
│  │  • useSeasonData.ts — Fetches & caches JSON    │  │
│  │  • useSortable.ts — Generic sort hook          │  │
│  │  • teamColors.ts — F1 constructor hex colors   │  │
│  │  • types/index.ts — TypeScript interfaces      │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘

                           │
                    Hosted on
                    GitHub Pages
                           │
                           ▼

            matfillion.github.io
            /F1-Fantasy-Budget-Builder/
```

## Data Flow

1. **After each race** → GitHub Action runs `scripts/fetch-fantasy-data.py`
2. **Python script** → Calls `fantasy.formula1.com/feeds/` API for schedule + per-gameday scores
3. **Writes JSON** → `public/data/2026/` (driver/constructor files + season.json)
4. **Commits & pushes** → Triggers the deploy workflow
5. **Deploy workflow** → Runs tests (Vitest + Playwright) → Builds → Deploys to GitHub Pages
6. **User visits site** → React app fetches JSON from GitHub Pages CDN → Renders tables

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Data format | Static JSON files | Data changes ~24 times/year; no backend needed |
| Hosting | GitHub Pages | Free, automatic deploys via Actions |
| Data source | Direct API calls | `formula-fantasy` library was stuck on 2025 season |
| Framework | React + Vite | Fast dev experience, familiar ecosystem |
| Styling | Tailwind CSS | Rapid mobile-first development |
| Testing | Vitest + Playwright | Unit tests for logic, E2E for smoke testing |
