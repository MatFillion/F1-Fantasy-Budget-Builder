import { useCallback, useMemo } from 'react';
import type { Driver, Constructor, RaceInfo } from '../types';
import { getTeamColor } from '../config/teamColors';
import { useSortable } from '../hooks/useSortable';
import {
  calculatePriceChangeThresholds,
  type PriceChangeResult,
  type PerformanceTier,
} from '../config/priceChange';

interface PricesTableProps {
  drivers: Driver[];
  constructors: Constructor[];
  races: RaceInfo[];
}

interface PriceRow {
  kind: 'driver' | 'constructor';
  name: string;
  team: string;
  price: number;
  priceDisplay: string;
  totalPoints: number;
  ptsPerPrice: number;
  priceChange: PriceChangeResult;
}

function parsePrice(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

function SortArrow({ field, sortConfig }: { field: string; sortConfig: { field: string; direction: string } }) {
  if (sortConfig.field !== field) return <span className="ml-1 text-gray-600">▲</span>;
  return <span className="ml-1 text-gray-300">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
}

const TIER_STYLES: Record<PerformanceTier, string> = {
  great: 'bg-green-900/60 text-green-300 border-green-700',
  good: 'bg-blue-900/60 text-blue-300 border-blue-700',
  poor: 'bg-yellow-900/60 text-yellow-300 border-yellow-700',
  terrible: 'bg-red-900/60 text-red-300 border-red-700',
};

function TierBadge({ tier }: { tier: PerformanceTier }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${TIER_STYLES[tier]}`}>
      {tier}
    </span>
  );
}

function PointsNeededCell({ points }: { points: number }) {
  if (points <= 0) {
    return (
      <td className="px-2 py-2 text-center font-mono text-gray-500 line-through">
        {points}
      </td>
    );
  }
  let colorClass = 'text-red-400';
  if (points < 20) colorClass = 'text-green-400';
  else if (points <= 40) colorClass = 'text-yellow-400';

  return (
    <td className={`px-2 py-2 text-center font-mono ${colorClass}`}>
      {points}
    </td>
  );
}

function PriceChangeBadge({ change }: { change: number }) {
  if (change === 0) return <span className="text-gray-500">—</span>;
  const isPositive = change > 0;
  return (
    <span className={`font-mono font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
      {isPositive ? '+' : ''}{change.toFixed(1)}M
    </span>
  );
}

const TOTAL_COLUMNS = 11;

export default function PricesTable({ drivers, constructors }: PricesTableProps) {
  const driverRows: PriceRow[] = useMemo(
    () =>
      drivers.map((d) => {
        const price = parsePrice(d.value);
        const recentPoints = d.races.map((r) => r.totalPoints);
        return {
          kind: 'driver',
          name: d.displayName,
          team: d.team,
          price,
          priceDisplay: d.value,
          totalPoints: d.seasonTotalPoints,
          ptsPerPrice: price > 0 ? d.seasonTotalPoints / price : 0,
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
          name: c.displayName,
          team: c.displayName,
          price,
          priceDisplay: c.value,
          totalPoints: c.seasonTotalPoints,
          ptsPerPrice: price > 0 ? c.seasonTotalPoints / price : 0,
          priceChange: calculatePriceChangeThresholds(price, recentPoints),
        };
      }),
    [constructors],
  );

  const getSortValue = useCallback(
    (row: PriceRow, field: string): number | string => {
      switch (field) {
        case 'name':
          return row.name;
        case 'team':
          return row.team;
        case 'price':
          return row.price;
        case 'total':
          return row.totalPoints;
        case 'ptsPerPrice':
          return row.ptsPerPrice;
        case 'avgPPM':
          return row.priceChange.avgPPM;
        case 'expectedChange':
          return row.priceChange.expectedPriceChange;
        default:
          return row.name;
      }
    },
    [],
  );

  const { sorted: sortedDrivers, sortConfig, toggleSort } = useSortable(driverRows, getSortValue);
  const { sorted: sortedConstructors } = useSortable(constructorRows, getSortValue, sortConfig.field, sortConfig.direction);

  const headerCells: { field: string; label: string; align: string }[] = [
    { field: 'name', label: 'Name', align: 'text-left' },
    { field: 'price', label: 'Price', align: 'text-right' },
    { field: 'ptsPerPrice', label: 'Pts/$', align: 'text-right' },
    { field: 'avgPPM', label: 'AvgPPM', align: 'text-right' },
    { field: 'expectedChange', label: 'Δ Price', align: 'text-center' },
  ];

  // Threshold columns for points needed
  const thresholdHeaders: { tier: PerformanceTier; label: string }[] = [
    { tier: 'great', label: '→ Great' },
    { tier: 'good', label: '→ Good' },
    { tier: 'poor', label: '→ Poor' },
    { tier: 'terrible', label: '→ Terrible' },
  ];

  function renderRow(row: PriceRow) {
    const teamColor = getTeamColor(row.team);
    const pc = row.priceChange;

    return (
      <tr
        key={`${row.kind}-${row.name}`}
        className="border-t border-gray-700 bg-gray-800 hover:bg-gray-750 transition-colors"
      >
        {/* Name */}
        <td
          className="sticky left-0 z-10 bg-gray-950 px-3 py-2 whitespace-nowrap font-medium"
          style={{ borderLeft: `4px solid ${teamColor.primary}` }}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: teamColor.primary }}
            />
            <span className="text-gray-100">{row.name}</span>
          </div>
        </td>
        {/* Price + Tier */}
        <td className="px-3 py-2 text-right whitespace-nowrap">
          <span className="text-gray-100 font-mono">{row.priceDisplay}</span>
          <span className={`ml-1.5 text-[10px] font-bold px-1 py-0.5 rounded ${
            pc.priceTier === 'A'
              ? 'bg-purple-900/50 text-purple-300'
              : 'bg-cyan-900/50 text-cyan-300'
          }`}>
            {pc.priceTier}
          </span>
        </td>
        {/* Pts/Price */}
        <td className="px-3 py-2 text-right font-mono text-emerald-400">
          {row.ptsPerPrice > 0 ? row.ptsPerPrice.toFixed(1) : '—'}
        </td>
        {/* AvgPPM + Performance Badge */}
        <td className="px-3 py-2 text-right whitespace-nowrap">
          <span className="font-mono text-gray-100 mr-2">{pc.avgPPM.toFixed(3)}</span>
          <TierBadge tier={pc.performanceTier} />
        </td>
        {/* Expected Price Change */}
        <td className="px-3 py-2 text-center">
          <PriceChangeBadge change={pc.expectedPriceChange} />
        </td>
        {/* Points needed for each threshold */}
        {pc.thresholds.map((t) => (
          <PointsNeededCell key={t.tier} points={t.pointsNeeded} />
        ))}
      </tr>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table className="w-full min-w-max border-collapse bg-gray-900 text-xs sm:text-sm">
        <thead>
          <tr className="bg-gray-800 text-gray-300 uppercase tracking-wider">
            {headerCells.map((h) => (
              <th
                key={h.field}
                className={`px-3 py-2 cursor-pointer whitespace-nowrap ${h.align} ${h.field === 'name' ? 'sticky left-0 z-10 bg-gray-800' : ''}`}
                onClick={() => toggleSort(h.field)}
              >
                {h.label} <SortArrow field={h.field} sortConfig={sortConfig} />
              </th>
            ))}
            {/* Threshold headers group */}
            <th colSpan={4} className="px-2 py-1 text-center border-l border-gray-600">
              <div className="text-[10px] text-gray-400 font-normal mb-0.5">Pts Needed Next Race →</div>
            </th>
          </tr>
          {/* Sub-headers for threshold columns */}
          <tr className="bg-gray-800/80 text-gray-400 text-[10px] uppercase tracking-wider">
            {headerCells.map((h) => (
              <th key={`sub-${h.field}`} className={h.field === 'name' ? 'sticky left-0 z-10 bg-gray-800/80' : ''} />
            ))}
            {thresholdHeaders.map((t) => (
              <th key={t.tier} className={`px-2 py-1 text-center whitespace-nowrap border-l border-gray-700/50 ${TIER_STYLES[t.tier].split(' ')[1]}`}>
                {t.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Drivers section */}
          <tr className="bg-gray-950">
            <td
              colSpan={TOTAL_COLUMNS}
              className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-gray-500"
            >
              Drivers
            </td>
          </tr>
          {sortedDrivers.map(renderRow)}

          {/* Constructors section */}
          <tr className="bg-gray-950">
            <td
              colSpan={TOTAL_COLUMNS}
              className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-gray-500"
            >
              Constructors
            </td>
          </tr>
          {sortedConstructors.map(renderRow)}
        </tbody>
      </table>
    </div>
  );
}
