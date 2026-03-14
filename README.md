# F1 Fantasy Grid Notes

A mobile-first web app that shows exactly how many points each F1 Fantasy driver and constructor needs in the next race to trigger a price change.

**🔗 Live site: [matfillion.github.io/F1-Fantasy-Budget-Builder](https://matfillion.github.io/F1-Fantasy-Budget-Builder/)**

Inspired by [f1fantasytools.com/budget-builder](https://f1fantasytools.com/budget-builder), but focused on historical data — what actually happened, not predictions.

## Features

- **Price Change Calculator** — Shows exactly how many points each driver/constructor needs to trigger each price-change tier (±0.1/0.3 for Tier A, ±0.2/0.6 for Tier B). See [PRICE-CHANGE-ALGORITHM.md](docs/PRICE-CHANGE-ALGORITHM.md) for the full formula.
- **Team Colors** — Every row uses official F1 constructor colors
- **Mobile-First** — Compact tables with sticky columns, designed for phones
- **Auto-Updated Data** — GitHub Action scrapes the official F1 Fantasy API weekly

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a full diagram.

**TL;DR:** Static React app → GitHub Pages. Data fetched by a Python script (GitHub Action cron) from the official F1 Fantasy feeds API → committed as JSON → triggers rebuild & deploy.

## Development

```bash
npm install --legacy-peer-deps
npm run dev          # Start dev server
npm run lint         # ESLint
npm test             # Run unit/component tests (Vitest)
npm run test:e2e     # Run E2E tests (Playwright)
npm run build        # Production build
```

A pre-commit hook (husky + lint-staged) runs ESLint and the unit tests on staged TypeScript files before each commit.

## Data

Race data lives in `public/data/2026/` as static JSON files. Updated automatically after each race by the [scrape workflow](.github/workflows/scrape-data.yml), or manually via `python scripts/fetch-fantasy-data.py`.

### Data schema

```
public/data/2026/
  season.json          # { year, races[], drivers[], constructors[] }
  drivers/<ABR>.json   # Driver — abbreviation, displayName, team, value, races[]
  constructors/<ABR>.json  # Constructor — abbreviation, displayName, value, races[]
```

Each `races[]` entry contains `round`, `raceName`, `totalPoints`, plus `race` and `sprint` breakdowns. See `src/types/index.ts` for the full TypeScript interface.

## Browser support

Tested on Chrome, Firefox, and Safari (latest). Requires ES2023 support — no IE11.

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS (Vite)
- **Testing:** Vitest (unit/component) + Playwright (E2E)
- **Hosting:** GitHub Pages
- **Data Source:** [fantasy.formula1.com](https://fantasy.formula1.com) feeds API
- **CI/CD:** GitHub Actions (lint → test → e2e → build → deploy)

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm install` fails with peer-dep error | Use `npm install --legacy-peer-deps` |
| E2E tests fail locally | Run `npm run build` first, then `npm run test:e2e` |
| Data appears stale | Trigger the [scrape workflow](https://github.com/matfillion/F1-Fantasy-Budget-Builder/actions/workflows/scrape-data.yml) manually |
| Driver/constructor missing from table | Their JSON file may have failed to load — check the browser console for network errors |
