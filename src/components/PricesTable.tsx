import { useCallback, useMemo } from 'react';
import type { Driver, Constructor, RaceInfo } from '../types';
import { getTeamColor } from '../config/teamColors';
import { useSortable } from '../hooks/useSortable';
import {
  calculatePriceChangeThresholds,
  PRICE_TIER_BOUNDARY,
  type PriceChangeResult,
} from '../config/priceChange';

interface PricesTableProps {
  drivers: Driver[];
  constructors: Constructor[];
  races: RaceInfo[];
}

interface PriceRow {
  kind: 'driver' | 'constructor';
  abbreviation: string;
  team: string;
  price: number;
  priceDisplay: string;
  totalPoints: number;
  priceChange: PriceChangeResult;
}

function parsePrice(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

function SortArrow({ field, sortConfig }: { field: string; sortConfig: { field: string; direction: string } }) {
  if (sortConfig.field !== field) return null;
  return <span className="ml-0.5 opacity-70">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
}

// Thresholds come out great→terrible (+0.3/+0.6 … -0.3/-0.6).
// Reverse so columns display worst→best to match reference layout.
function reversedThresholds(pc: PriceChangeResult) {
  return [...pc.thresholds].reverse();
}

function PointsNeededCell({ points, change }: { points: number; change: number }) {
  const achieved = points <= 0;
  if (achieved) {
    const cls = change > 0
      ? 'bg-green-500/20 text-green-300 font-bold'
      : 'bg-red-500/20 text-red-300 font-bold';
    return (
      <td className="px-2 py-1.5 text-center">
        <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-mono tabular-nums ${cls}`}>
          {points}
        </span>
      </td>
    );
  }

  let colorClass = 'text-gray-400';
  if (points < 15) colorClass = change > 0 ? 'text-green-400' : 'text-red-400';
  else if (points <= 35) colorClass = 'text-yellow-400';
  else colorClass = 'text-gray-500';

  return (
    <td className={`px-2 py-1.5 text-center font-mono text-[11px] tabular-nums ${colorClass}`}>
      {points}
    </td>
  );
}

// Header badge for the price-change tier columns
function TierBadge({ label, positive }: { label: string; positive: boolean }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold font-mono
      ${positive
        ? 'bg-green-900/60 text-green-300 border border-green-700/50'
        : 'bg-red-900/60 text-red-300 border border-red-700/50'}`}>
      {label}
    </span>
  );
}

// Expected price-change badge for the last column
function PriceChangeBadge({ change }: { change: number }) {
  if (change === 0) return <span className="text-gray-500 font-mono text-[11px]">—</span>;
  const positive = change > 0;
  return (
    <span className={`inline-block px-2 py-0.5 rounded font-mono text-[11px] font-bold
      ${positive
        ? 'bg-green-500/20 text-green-300 border border-green-600/40'
        : 'bg-red-500/20 text-red-300 border border-red-600/40'}`}>
      {positive ? '+' : ''}{change.toFixed(2)}
    </span>
  );
}

// tier-change headers ordered worst→best (matching column order)
const TIER_A_HEADERS = [
  { label: '−0.3', positive: false },
  { label: '−0.1', positive: false },
  { label: '+0.1', positive: true },
  { label: '+0.3', positive: true },
];

const TIER_B_HEADERS = [
  { label: '−0.6', positive: false },
  { label: '−0.2', positive: false },
  { label: '+0.2', positive: true },
  { label: '+0.6', positive: true },
];

const TOTAL_COLS = 7; // name, $, ×4 threshold, xΔ$

function TierTable({
  label,
  sublabel,
  driverRows,
  constructorRows,
  headers,
  sortConfig,
  toggleSort,
}: {
  label: string;
  sublabel: string;
  driverRows: PriceRow[];
  constructorRows: PriceRow[];
  headers: { label: string; positive: boolean }[];
  sortConfig: { field: string; direction: string };
  toggleSort: (f: string) => void;
}) {
  function renderRows(rows: PriceRow[]) {
    return rows.map((row) => {
      const teamColor = getTeamColor(row.team);
      const pc = row.priceChange;
      const thresholds = reversedThresholds(pc);

      return (
        <tr
          key={`${row.kind}-${row.abbreviation}`}
          className="border-t border-gray-700/20 hover:bg-white/[0.03] transition-colors"
        >
          {/* Name badge */}
          <td className="sticky left-0 z-10 bg-[#111318] px-2 py-1.5">
            <span
              className="inline-block w-10 text-center py-0.5 rounded text-[11px] font-bold tracking-wide"
              style={{
                border: `1.5px solid ${teamColor.primary}`,
                color: teamColor.primary,
                backgroundColor: `${teamColor.primary}18`,
              }}
            >
              {row.abbreviation}
            </span>
          </td>
          {/* Price */}
          <td className="px-2 py-1.5 text-right font-mono text-[11px] text-gray-300 tabular-nums whitespace-nowrap">
            {row.priceDisplay}
          </td>
          {/* Points needed columns (worst → best) */}
          {thresholds.map((t) => (
            <PointsNeededCell key={t.tier} points={t.pointsNeeded} change={t.priceChange} />
          ))}
          {/* Expected price change — last column */}
          <td className="px-2 py-1.5 text-center">
            <PriceChangeBadge change={pc.expectedPriceChange} />
          </td>
        </tr>
      );
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700/60">
      <table className="w-full border-collapse text-xs bg-[#111318]">
        <thead>
          {/* Row 1 – tier label + price-change badges */}
          <tr className="bg-[#0d0f14] border-b border-gray-700/40">
            <th
              colSpan={2}
              className="sticky left-0 z-10 bg-[#0d0f14] px-3 py-2 text-left"
            >
              <span className="text-[11px] font-bold text-gray-200">{label}</span>
              <span className="ml-1.5 text-[10px] text-gray-500">{sublabel}</span>
            </th>
            {headers.map((h, i) => (
              <th key={i} className="px-2 py-2 text-center">
                <TierBadge label={h.label} positive={h.positive} />
              </th>
            ))}
            <th
              className="px-2 py-2 text-center cursor-pointer text-gray-400 text-[10px] uppercase tracking-wider whitespace-nowrap"
              onClick={() => toggleSort('lastChange')}
            >
              xΔ$<SortArrow field="lastChange" sortConfig={sortConfig} />
            </th>
          </tr>
          {/* Row 2 – column labels */}
          <tr className="bg-[#0d0f14] border-b border-gray-700/60 text-[10px] uppercase tracking-wider text-gray-500">
            <th
              className="sticky left-0 z-10 bg-[#0d0f14] px-3 py-1.5 text-left cursor-pointer"
              onClick={() => toggleSort('name')}
            >
              CR<SortArrow field="name" sortConfig={sortConfig} />
            </th>
            <th
              className="px-2 py-1.5 text-right cursor-pointer"
              onClick={() => toggleSort('price')}
            >
              $<SortArrow field="price" sortConfig={sortConfig} />
            </th>
            {headers.map((_, i) => (
              <th key={i} className="px-2 py-1.5 text-center text-gray-600">Pts</th>
            ))}
            <th className="px-2 py-1.5 text-center">↕</th>
          </tr>
        </thead>
        <tbody>
          {driverRows.length > 0 && (
            <tr className="bg-[#0d0f14]/80 border-t border-gray-700/40">
              <td colSpan={TOTAL_COLS} className="px-3 py-1 text-[9px] uppercase tracking-widest font-bold text-gray-600">
                Drivers
              </td>
            </tr>
          )}
          {renderRows(driverRows)}
          {constructorRows.length > 0 && (
            <tr className="bg-[#0d0f14]/80 border-t border-gray-700/40">
              <td colSpan={TOTAL_COLS} className="px-3 py-1 text-[9px] uppercase tracking-widest font-bold text-gray-600">
                Constructors
              </td>
            </tr>
          )}
          {renderRows(constructorRows)}
        </tbody>
      </table>
    </div>
  );
}

export default function PricesTable({ drivers, constructors }: PricesTableProps) {
  const driverRows: PriceRow[] = useMemo(() =>
    drivers.map((d): PriceRow => {
      const price = parsePrice(d.value);
      return {
        kind: 'driver',
        abbreviation: d.abbreviation,
        team: d.team,
        price,
        priceDisplay: d.value,
        totalPoints: d.seasonTotalPoints,
        priceChange: calculatePriceChangeThresholds(price, d.races.map((r) => r.totalPoints)),
      };
    }),
  [drivers]);

  const constructorRows: PriceRow[] = useMemo(() =>
    constructors.map((c): PriceRow => {
      const price = parsePrice(c.value);
      return {
        kind: 'constructor',
        abbreviation: c.abbreviation,
        team: c.displayName,
        price,
        priceDisplay: c.value,
        totalPoints: c.seasonTotalPoints,
        priceChange: calculatePriceChangeThresholds(price, c.races.map((r) => r.totalPoints)),
      };
    }),
  [constructors]);

  const getSortValue = useCallback(
    (row: PriceRow, field: string): number | string => {
      switch (field) {
        case 'name': return row.abbreviation;
        case 'price': return row.price;
        case 'total': return row.totalPoints;
        case 'lastChange': return row.priceChange.expectedPriceChange;
        default: return row.abbreviation;
      }
    },
    [],
  );

  const { sorted: sortedDrivers, sortConfig, toggleSort } = useSortable(driverRows, getSortValue);
  const { sorted: sortedConstructors } = useSortable(constructorRows, getSortValue, sortConfig.field, sortConfig.direction);

  const tierADrivers = useMemo(() => sortedDrivers.filter((r) => r.price >= PRICE_TIER_BOUNDARY), [sortedDrivers]);
  const tierBDrivers = useMemo(() => sortedDrivers.filter((r) => r.price < PRICE_TIER_BOUNDARY), [sortedDrivers]);
  const tierAConstructors = useMemo(() => sortedConstructors.filter((r) => r.price >= PRICE_TIER_BOUNDARY), [sortedConstructors]);
  const tierBConstructors = useMemo(() => sortedConstructors.filter((r) => r.price < PRICE_TIER_BOUNDARY), [sortedConstructors]);

  return (
    <div className="flex flex-col gap-4">
      <TierTable
        label="Tier A"
        sublabel={`≥${PRICE_TIER_BOUNDARY}M`}
        driverRows={tierADrivers}
        constructorRows={tierAConstructors}
        headers={TIER_A_HEADERS}
        sortConfig={sortConfig}
        toggleSort={toggleSort}
      />
      <TierTable
        label="Tier B"
        sublabel={`<${PRICE_TIER_BOUNDARY}M`}
        driverRows={tierBDrivers}
        constructorRows={tierBConstructors}
        headers={TIER_B_HEADERS}
        sortConfig={sortConfig}
        toggleSort={toggleSort}
      />
    </div>
  );
}
