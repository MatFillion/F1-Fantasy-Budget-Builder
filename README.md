# F1 Fantasy Budget Builder

A mobile-first web app that tracks F1 Fantasy points scored by each driver and constructor per race, and calculates the points needed for price changes.

**🔗 Live site: [matfillion.github.io/F1-Fantasy-Budget-Builder](https://matfillion.github.io/F1-Fantasy-Budget-Builder/)**

Inspired by [f1fantasytools.com/budget-builder](https://f1fantasytools.com/budget-builder), but focused on historical data — what actually happened, not predictions.

## Features

- **Price Change Calculator** — Shows exactly how many points each driver/constructor needs in the next race to trigger each price change tier. See [PRICE-CHANGE-ALGORITHM.md](docs/PRICE-CHANGE-ALGORITHM.md) for the full formula.
- **Drivers & Constructors Tables** — Per-race fantasy points with expandable breakdowns (qualifying, race position, overtakes, fastest lap, DotD, sprint)
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
npm test             # Run unit/component tests (Vitest)
npm run test:e2e     # Run E2E tests (Playwright)
npm run build        # Production build
```

## Data

Race data lives in `public/data/2026/` as static JSON files. Updated automatically after each race by the [scrape workflow](.github/workflows/scrape-data.yml), or manually via `python scripts/fetch-fantasy-data.py`.

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS (Vite)
- **Testing:** Vitest (73 unit/component tests) + Playwright (6 E2E tests)
- **Hosting:** GitHub Pages
- **Data Source:** [fantasy.formula1.com](https://fantasy.formula1.com) feeds API
- **CI/CD:** GitHub Actions (test → e2e → build → deploy)
