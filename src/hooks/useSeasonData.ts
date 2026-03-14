import { useState, useEffect } from 'react';
import type { Season, Driver, Constructor } from '../types';

interface SeasonData {
  season: Season | null;
  drivers: Driver[];
  constructors: Constructor[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches the 2026 season metadata, all driver JSON files, and all constructor
 * JSON files from the static `public/data/` directory.
 *
 * Uses `Promise.allSettled` for individual driver/constructor files so that a
 * single missing file does not prevent the rest of the data from loading.
 */
export function useSeasonData(): SeasonData {
  const [season, setSeason] = useState<Season | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [constructors, setConstructors] = useState<Constructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Load season metadata
        const seasonRes = await fetch(`${import.meta.env.BASE_URL}data/2026/season.json`);
        if (!seasonRes.ok) throw new Error('Failed to load season data');
        const seasonData: Season = await seasonRes.json();
        setSeason(seasonData);

        // Load all drivers in parallel; skip any that fail to load
        const driverPromises = seasonData.drivers.map(async (abbr) => {
          const res = await fetch(`${import.meta.env.BASE_URL}data/2026/drivers/${abbr}.json`);
          if (!res.ok) throw new Error(`Failed to load driver ${abbr}`);
          return res.json() as Promise<Driver>;
        });
        const driverResults = await Promise.allSettled(driverPromises);
        const driverData = driverResults
          .filter((r): r is PromiseFulfilledResult<Driver> => r.status === 'fulfilled')
          .map((r) => r.value);
        setDrivers(driverData);

        // Load all constructors in parallel; skip any that fail to load
        const constructorPromises = seasonData.constructors.map(async (abbr) => {
          const res = await fetch(`${import.meta.env.BASE_URL}data/2026/constructors/${abbr}.json`);
          if (!res.ok) throw new Error(`Failed to load constructor ${abbr}`);
          return res.json() as Promise<Constructor>;
        });
        const constructorResults = await Promise.allSettled(constructorPromises);
        const constructorData = constructorResults
          .filter((r): r is PromiseFulfilledResult<Constructor> => r.status === 'fulfilled')
          .map((r) => r.value);
        setConstructors(constructorData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { season, drivers, constructors, loading, error };
}
