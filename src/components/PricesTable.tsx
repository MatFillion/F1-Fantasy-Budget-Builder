import { useCallback, useMemo } from 'react';
import type { Driver, Constructor, RaceInfo } from '../types';
import { getTeamColor } from '../config/teamColors';
import { useSortable } from '../hooks/useSortable';
import {
  calculatePriceChangeThresholds,
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
  const isPositive = change > 0;
  if (points <= 0) {
    return (
      <td className="px-1 py-1 text-center font-mono text-[11px] text-gray-500">
        ✓
      </td>
    );
  }
  let colorClass = 'text-red-400';
  if (points < 20) colorClass = isPositive ? 'text-green-400' : 'text-red-400';
  else if (points <= 40) colorClass = 'text-yellow-400';

  return (
    <td className={`px-1 py-1 text-center font-mono text-[11px] ${colorClass}`}>
      {points}
    </td>
  );
}

const TOTAL_COLUMNS = 7;

export default function PricesTable({ drivers, constructors }: PricesTableProps) {
  const driverRows: PriceRow[] = useMemo(
    () =>
      drivers.map((d) => {
        const price = parsePrice(d.value);
        const recentPoints = d.races.map((r) => r.totalPoints);
        return {
          kind: 'driver',
          abbreviation: d.abbreviation,
          team: d.team,
          price,
          priceDisplay: d.value,
          totalPoints: d.seasonTotalPoints,
          priceChange: calculatePriceChangeThresholds(price, recentPoints),
        };
      }),
    [drivers],
  );

  const constructorRows: PriceRow[] = useMemo(
    () =>
      constructors.map((c) => {
        const price = parsePrice(c.value);
        const recentPoints = c.races.map((r) => r.totalPoints);
        return {
          kind: 'constructor',
          abbreviation: c.abbreviation,
          team: c.displayName,
          price,
          priceDisplay: c.value,
          totalPoints: c.seasonTotalPoints,
          priceChange: calculatePriceChangeThresholds(price, recentPoints),
        };
      }),
    [constructors],
  );

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

  // Column headers: price change values depend on tier, show both tiers
  const thresholdCols = [
    { idx: 0, label: '+0.3', labelB: '+0.6', color: 'text-green-400' },
    { idx: 1, label: '+0.1', labelB: '+0.2', color: 'text-green-400' },
    { idx: 2, label: '−0.1', labelB: '−0.2', color: 'text-red-400' },
    { idx: 3, label: '−0.3', labelB: '−0.6', color: 'text-red-400' },
  ];

  function renderRow(row: PriceRow) {
    const teamColor = getTeamColor(row.team);
    const pc = row.priceChange;

    return (
      <tr
        key={`${row.kind}-${row.abbreviation}`}
        className="border-t border-gray-700/50 hover:bg-gray-800/80 transition-colors"
      >
        <td
          className="sticky left-0 z-10 bg-gray-900 pl-1 pr-2 py-1 whitespace-nowrap font-bold text-[11px] tracking-wide"
          style={{ borderLeft: `3px solid ${teamColor.primary}` }}
        >
          <span className="text-gray-100">{row.abbreviation}</span>
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
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table className="w-full border-collapse bg-gray-900 text-xs">
        <thead>
          <tr className="bg-gray-800 text-gray-400 text-[10px] uppercase tracking-wider">
            <th
              className="sticky left-0 z-10 bg-gray-800 pl-1 pr-2 py-1.5 text-left cursor-pointer whitespace-nowrap"
              onClick={() => toggleSort('name')}
            >
              Name<SortArrow field="name" sortConfig={sortConfig} />
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
            <th colSpan={4} className="px-1 py-1 text-center border-l border-gray-600">
              <span className="text-[9px] text-gray-500 font-normal">Pts needed next race</span>
            </th>
          </tr>
          <tr className="bg-gray-800/80 text-[9px] tracking-wider">
            <th className="sticky left-0 z-10 bg-gray-800/80" />
            <th />
            <th />
            {thresholdCols.map((c) => (
              <th key={c.idx} className={`px-1 py-0.5 text-center font-mono font-bold border-l border-gray-700/40 ${c.color}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="bg-gray-950">
            <td colSpan={TOTAL_COLUMNS} className="px-1 py-1 text-[9px] uppercase tracking-widest font-bold text-gray-500">
              Drivers
            </td>
          </tr>
          {sortedDrivers.map(renderRow)}
          <tr className="bg-gray-950">
            <td colSpan={TOTAL_COLUMNS} className="px-1 py-1 text-[9px] uppercase tracking-widest font-bold text-gray-500">
              Constructors
            </td>
          </tr>
          {sortedConstructors.map(renderRow)}
        </tbody>
      </table>
    </div>
  );
}
