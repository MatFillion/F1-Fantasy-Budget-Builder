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
  return <span className="ml-0.5 text-gray-300">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
}

function PointsNeededCell({ points, change }: { points: number; change: number }) {
  if (points <= 0) {
    return (
      <td className="px-1 py-1 text-center font-mono text-[11px] text-gray-500">
        ✓
      </td>
    );
  }
  const isPositive = change > 0;
  let colorClass = 'text-red-400';
  if (points < 20) colorClass = isPositive ? 'text-green-400' : 'text-red-400';
  else if (points <= 40) colorClass = 'text-yellow-400';

  return (
    <td className={`px-1 py-1 text-center font-mono text-[11px] ${colorClass}`}>
      {points}
    </td>
  );
}

const COLS = 7;

const TIER_A_HEADERS = [
  { label: '+0.3', color: 'text-green-400' },
  { label: '+0.1', color: 'text-green-400' },
  { label: '−0.1', color: 'text-red-400' },
  { label: '−0.3', color: 'text-red-400' },
];

const TIER_B_HEADERS = [
  { label: '+0.6', color: 'text-green-400' },
  { label: '+0.2', color: 'text-green-400' },
  { label: '−0.2', color: 'text-red-400' },
  { label: '−0.6', color: 'text-red-400' },
];

function TierTable({
  label,
  rows,
  headers,
  sortConfig,
  toggleSort,
}: {
  label: string;
  rows: PriceRow[];
  headers: { label: string; color: string }[];
  sortConfig: { field: string; direction: string };
  toggleSort: (f: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table className="w-full border-collapse bg-gray-900 text-xs">
        <thead>
          <tr className="bg-gray-800 text-gray-400 text-[10px] uppercase tracking-wider">
            <th
              className="sticky left-0 z-10 bg-gray-800 w-0 pl-1 pr-1 py-1.5 text-left cursor-pointer whitespace-nowrap"
              onClick={() => toggleSort('name')}
            >
              {label}<SortArrow field="name" sortConfig={sortConfig} />
            </th>
            <th
              className="px-1 py-1.5 text-right cursor-pointer whitespace-nowrap"
              onClick={() => toggleSort('price')}
            >
              Price<SortArrow field="price" sortConfig={sortConfig} />
            </th>
            <th
              className="px-1 py-1.5 text-center cursor-pointer whitespace-nowrap"
              onClick={() => toggleSort('lastChange')}
            >
              Last Δ<SortArrow field="lastChange" sortConfig={sortConfig} />
            </th>
            {headers.map((h, i) => (
              <th key={i} className={`px-1 py-1.5 text-center font-mono font-bold border-l border-gray-700/40 ${h.color}`}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const teamColor = getTeamColor(row.team);
            const pc = row.priceChange;
            const isOdd = idx % 2 === 1;
            const rowBg = isOdd ? 'bg-[#1a2030]' : 'bg-gray-900';

            return (
              <tr
                key={`${row.kind}-${row.abbreviation}`}
                className={`border-t border-gray-700/30 hover:bg-gray-700/40 transition-colors ${rowBg}`}
              >
                <td
                  className={`sticky left-0 z-10 ${rowBg} w-0 pl-1 pr-1 py-1 whitespace-nowrap font-bold text-[11px] tracking-wide`}
                  style={{ borderLeft: `3px solid ${teamColor.primary}` }}
                >
                  {row.abbreviation}
                </td>
                <td className="px-1 py-1 text-right font-mono text-[11px] text-gray-300">
                  {row.priceDisplay}
                </td>
                <td className="px-1 py-1 text-center font-mono text-[11px]">
                  {pc.expectedPriceChange === 0 ? (
                    <span className="text-gray-500">—</span>
                  ) : (
                    <span className={pc.expectedPriceChange > 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                      {pc.expectedPriceChange > 0 ? '+' : ''}{pc.expectedPriceChange.toFixed(1)}
                    </span>
                  )}
                </td>
                {pc.thresholds.map((t) => (
                  <PointsNeededCell key={t.tier} points={t.pointsNeeded} change={t.priceChange} />
                ))}
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={COLS} className="px-2 py-3 text-center text-gray-500 text-[11px]">No assets</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function PricesTable({ drivers, constructors }: PricesTableProps) {
  const allRows: PriceRow[] = useMemo(() => {
    const dRows = drivers.map((d): PriceRow => {
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
    });
    const cRows = constructors.map((c): PriceRow => {
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
    });
    return [...dRows, ...cRows];
  }, [drivers, constructors]);

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

  const { sorted, sortConfig, toggleSort } = useSortable(allRows, getSortValue);

  const tierA = useMemo(() => sorted.filter((r) => r.price >= PRICE_TIER_BOUNDARY), [sorted]);
  const tierB = useMemo(() => sorted.filter((r) => r.price < PRICE_TIER_BOUNDARY), [sorted]);

  return (
    <div className="flex flex-col gap-4">
      <TierTable
        label={`Tier A (≥${PRICE_TIER_BOUNDARY}M)`}
        rows={tierA}
        headers={TIER_A_HEADERS}
        sortConfig={sortConfig}
        toggleSort={toggleSort}
      />
      <TierTable
        label={`Tier B (<${PRICE_TIER_BOUNDARY}M)`}
        rows={tierB}
        headers={TIER_B_HEADERS}
        sortConfig={sortConfig}
        toggleSort={toggleSort}
      />
    </div>
  );
}
