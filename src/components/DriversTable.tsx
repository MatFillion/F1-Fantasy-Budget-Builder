import { useState, useCallback, Fragment } from 'react';
import type { Driver, RaceInfo } from '../types';
import { getTeamColor } from '../config/teamColors';
import { useSortable } from '../hooks/useSortable';

interface DriversTableProps {
  drivers: Driver[];
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

export default function DriversTable({ drivers, races }: DriversTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const getSortValue = useCallback(
    (driver: Driver, field: string): number | string => {
      if (field === 'name') return driver.displayName;
      if (field === 'total') return driver.seasonTotalPoints;
      if (field === 'average') {
        return driver.races.length > 0
          ? driver.seasonTotalPoints / driver.races.length
          : 0;
      }
      const race = driver.races.find((r) => r.round === field);
      return race?.totalPoints ?? 0;
    },
    [],
  );

  const { sorted, sortConfig, toggleSort } = useSortable(drivers, getSortValue);

  const toggleRow = (abbreviation: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(abbreviation)) next.delete(abbreviation);
      else next.add(abbreviation);
      return next;
    });
  };

  const raceCols = races.length;
  const totalCols = 3 + raceCols; // driver + total + avg + races

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table className="w-full min-w-max border-collapse bg-gray-900 text-xs sm:text-sm">
        <thead>
          <tr className="bg-gray-800 text-gray-300 uppercase tracking-wider">
            <th
              className="sticky left-0 z-10 bg-gray-800 px-3 py-2 text-left cursor-pointer whitespace-nowrap"
              onClick={() => toggleSort('name')}
            >
              Driver <SortArrow field="name" sortConfig={sortConfig} />
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
          {sorted.map((driver) => {
            const teamColor = getTeamColor(driver.team);
            const isExpanded = expandedRows.has(driver.abbreviation);
            const avg =
              driver.races.length > 0
                ? (driver.seasonTotalPoints / driver.races.length).toFixed(1)
                : '—';

            return (
              <Fragment key={driver.abbreviation}>
                <tr
                  className="border-t border-gray-700 bg-gray-800 hover:bg-gray-750 cursor-pointer transition-colors"
                  onClick={() => toggleRow(driver.abbreviation)}
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
                      <span className="text-gray-100">{driver.displayName}</span>
                      <span className="text-[10px] text-gray-500">
                        {isExpanded ? '▾' : '▸'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 block">{driver.team}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-gray-100">
                    {driver.seasonTotalPoints}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-300">{avg}</td>
                  {races.map((race) => {
                    const driverRace = driver.races.find((r) => r.round === race.round);
                    const pts = driverRace?.totalPoints ?? null;
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

                {isExpanded && (
                  <tr className="bg-gray-900">
                    <td colSpan={totalCols} className="px-4 py-3">
                      <div className="overflow-x-auto rounded border border-gray-700">
                        <table className="w-full min-w-max border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-800 text-gray-400 uppercase tracking-wider">
                              <th className="px-2 py-1.5 text-left">Race</th>
                              <th className="px-2 py-1.5 text-right">Pos</th>
                              <th className="px-2 py-1.5 text-right">Qual</th>
                              <th className="px-2 py-1.5 text-right">Overtake</th>
                              <th className="px-2 py-1.5 text-right">FL</th>
                              <th className="px-2 py-1.5 text-right">DotD</th>
                              <th className="px-2 py-1.5 text-right">Sprint</th>
                              <th className="px-2 py-1.5 text-right font-bold">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {driver.races.map((dr) => {
                              const sprintTotal =
                                dr.sprint.position +
                                dr.sprint.qualifyingPosition +
                                dr.sprint.fastestLap +
                                dr.sprint.overtakeBonus;
                              return (
                                <tr
                                  key={dr.round}
                                  className="border-t border-gray-700 hover:bg-gray-800"
                                >
                                  <td className="px-2 py-1 text-gray-300 whitespace-nowrap">
                                    {dr.raceName}
                                  </td>
                                  <td className="px-2 py-1 text-right text-gray-200">
                                    {dr.race.position}
                                  </td>
                                  <td className="px-2 py-1 text-right text-gray-200">
                                    {dr.race.qualifyingPosition}
                                  </td>
                                  <td className="px-2 py-1 text-right text-gray-200">
                                    {dr.race.overtakeBonus}
                                  </td>
                                  <td className="px-2 py-1 text-right text-gray-200">
                                    {dr.race.fastestLap}
                                  </td>
                                  <td className="px-2 py-1 text-right text-gray-200">
                                    {dr.race.dotd}
                                  </td>
                                  <td className="px-2 py-1 text-right text-gray-200">
                                    {sprintTotal > 0 ? sprintTotal : '—'}
                                  </td>
                                  <td
                                    className={`px-2 py-1 text-right font-bold ${pointColorClass(dr.totalPoints)}`}
                                  >
                                    {dr.totalPoints}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
