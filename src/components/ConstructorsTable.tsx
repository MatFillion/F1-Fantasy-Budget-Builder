import { useCallback } from 'react';
import type { Constructor, RaceInfo } from '../types';
import { getTeamColor } from '../config/teamColors';
import { useSortable } from '../hooks/useSortable';

interface ConstructorsTableProps {
  constructors: Constructor[];
  races: RaceInfo[];
}

function pointColorClass(pts: number): string {
  if (pts > 30) return 'text-green-400';
  if (pts >= 15) return 'text-yellow-400';
  if (pts >= 5) return 'text-gray-100';
  return 'text-red-400';
}

function SortArrow({ field, sortConfig }: { field: string; sortConfig: { field: string; direction: string } }) {
  if (sortConfig.field !== field) return <span className="ml-1 text-gray-600">▲</span>;
  return <span className="ml-1 text-gray-300">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
}

export default function ConstructorsTable({ constructors, races }: ConstructorsTableProps) {
  const getSortValue = useCallback(
    (c: Constructor, field: string): number | string => {
      if (field === 'name') return c.displayName;
      if (field === 'total') return c.seasonTotalPoints;
      if (field === 'average') {
        return c.races.length > 0 ? c.seasonTotalPoints / c.races.length : 0;
      }
      const race = c.races.find((r) => r.round === field);
      return race?.totalPoints ?? 0;
    },
    [],
  );

  const { sorted, sortConfig, toggleSort } = useSortable(constructors, getSortValue);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table className="w-full min-w-max border-collapse bg-gray-900 text-xs sm:text-sm">
        <thead>
          <tr className="bg-gray-800 text-gray-300 uppercase tracking-wider">
            <th
              className="sticky left-0 z-10 bg-gray-800 px-3 py-2 text-left cursor-pointer whitespace-nowrap"
              onClick={() => toggleSort('name')}
            >
              Constructor <SortArrow field="name" sortConfig={sortConfig} />
            </th>
            <th
              className="px-3 py-2 text-right cursor-pointer whitespace-nowrap"
              onClick={() => toggleSort('total')}
            >
              Total <SortArrow field="total" sortConfig={sortConfig} />
            </th>
            <th
              className="px-3 py-2 text-right cursor-pointer whitespace-nowrap"
              onClick={() => toggleSort('average')}
            >
              Avg <SortArrow field="average" sortConfig={sortConfig} />
            </th>
            {races.map((race) => (
              <th
                key={race.round}
                className="px-2 py-2 text-right cursor-pointer whitespace-nowrap"
                onClick={() => toggleSort(race.round)}
              >
                {race.raceName.slice(0, 3).toUpperCase()}
                {race.hasSprint && <span className="ml-0.5 text-[10px] text-yellow-500">S</span>}
                <SortArrow field={race.round} sortConfig={sortConfig} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => {
            const teamColor = getTeamColor(c.displayName);
            const avg =
              c.races.length > 0
                ? (c.seasonTotalPoints / c.races.length).toFixed(1)
                : '—';

            return (
              <tr
                key={c.abbreviation}
                className="border-t border-gray-700 bg-gray-800 hover:bg-gray-750 transition-colors"
              >
                <td
                  className="sticky left-0 z-10 bg-gray-950 px-3 py-2 whitespace-nowrap font-medium"
                  style={{ borderLeft: `4px solid ${teamColor.primary}` }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: teamColor.primary }}
                    />
                    <span className="text-gray-100">{c.displayName}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-bold text-gray-100">
                  {c.seasonTotalPoints}
                </td>
                <td className="px-3 py-2 text-right text-gray-300">{avg}</td>
                {races.map((race) => {
                  const cRace = c.races.find((r) => r.round === race.round);
                  const pts = cRace?.totalPoints ?? null;
                  return (
                    <td
                      key={race.round}
                      className={`px-2 py-2 text-right font-mono ${pts !== null ? pointColorClass(pts) : 'text-gray-600'}`}
                    >
                      {pts !== null ? pts : '—'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
