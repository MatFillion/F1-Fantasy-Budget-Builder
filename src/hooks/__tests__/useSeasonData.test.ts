import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSeasonData } from '../useSeasonData';

const mockSeason = {
  year: 2026,
  races: [{ round: '1', raceName: 'Australia', hasSprint: false }],
  drivers: ['VER', 'NOR'],
  constructors: ['RBR'],
};

const mockVER = {
  abbreviation: 'VER',
  displayName: 'Max Verstappen',
  team: 'Red Bull Racing',
  position: 1,
  value: '30.0M',
  seasonTotalPoints: 29,
  percentagePicked: 20,
  races: [],
};

const mockNOR = {
  abbreviation: 'NOR',
  displayName: 'Lando Norris',
  team: 'McLaren',
  position: 2,
  value: '28.0M',
  seasonTotalPoints: 18,
  percentagePicked: 35,
  races: [],
};

const mockRBR = {
  abbreviation: 'RBR',
  displayName: 'Red Bull Racing',
  value: '25.0M',
  seasonTotalPoints: 50,
  percentagePicked: 15,
  races: [],
};

function makeFetchMock(data: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
  } as Response);
}

describe('useSeasonData', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts in loading state', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useSeasonData());
    expect(result.current.loading).toBe(true);
    expect(result.current.season).toBeNull();
    expect(result.current.drivers).toEqual([]);
  });

  it('loads season, drivers, and constructors successfully', async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      const u = String(url);
      if (u.includes('season.json')) return makeFetchMock(mockSeason);
      if (u.includes('VER.json')) return makeFetchMock(mockVER);
      if (u.includes('NOR.json')) return makeFetchMock(mockNOR);
      if (u.includes('RBR.json')) return makeFetchMock(mockRBR);
      return makeFetchMock(null, false);
    });

    const { result } = renderHook(() => useSeasonData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.season?.year).toBe(2026);
    expect(result.current.drivers).toHaveLength(2);
    expect(result.current.constructors).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('sets error when season.json fails', async () => {
    vi.mocked(fetch).mockImplementation(() => makeFetchMock(null, false));

    const { result } = renderHook(() => useSeasonData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.season).toBeNull();
  });

  it('loads partial data when one driver fails', async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      const u = String(url);
      if (u.includes('season.json')) return makeFetchMock(mockSeason);
      if (u.includes('VER.json')) return makeFetchMock(mockVER);
      if (u.includes('NOR.json')) return makeFetchMock(null, false); // NOR fails
      if (u.includes('RBR.json')) return makeFetchMock(mockRBR);
      return makeFetchMock(null, false);
    });

    const { result } = renderHook(() => useSeasonData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // VER loads, NOR is skipped — no hard error
    expect(result.current.error).toBeNull();
    expect(result.current.drivers).toHaveLength(1);
    expect(result.current.drivers[0].abbreviation).toBe('VER');
  });

  it('handles fetch rejection (network error)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useSeasonData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network failure');
  });
});
