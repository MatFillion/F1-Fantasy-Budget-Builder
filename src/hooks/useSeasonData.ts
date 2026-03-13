import { useState, useEffect } from 'react';
import type { Season, Driver, Constructor } from '../types';

interface SeasonData {
  season: Season | null;
  drivers: Driver[];
  constructors: Constructor[];
  loading: boolean;
  error: string | null;
}

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
        const seasonRes = await fetch('/data/2026/season.json');
        if (!seasonRes.ok) throw new Error('Failed to load season data');
        const seasonData: Season = await seasonRes.json();
        setSeason(seasonData);

        // Load all drivers in parallel
        const driverPromises = seasonData.drivers.map(async (abbr) => {
          const res = await fetch(`/data/2026/drivers/${abbr}.json`);
          if (!res.ok) throw new Error(`Failed to load driver ${abbr}`);
          return res.json() as Promise<Driver>;
        });
        const driverData = await Promise.all(driverPromises);
        setDrivers(driverData);

        // Load all constructors in parallel
        const constructorPromises = seasonData.constructors.map(async (abbr) => {
          const res = await fetch(`/data/2026/constructors/${abbr}.json`);
          if (!res.ok) throw new Error(`Failed to load constructor ${abbr}`);
          return res.json() as Promise<Constructor>;
        });
        const constructorData = await Promise.all(constructorPromises);
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
