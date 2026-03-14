import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock the data hook
vi.mock('../hooks/useSeasonData', () => ({
  useSeasonData: vi.fn(),
}));

// Mock child components to isolate App shell tests
vi.mock('../components/PricesTable', () => ({
  default: () => <div data-testid="prices-table">PricesTable</div>,
}));

import { useSeasonData } from '../hooks/useSeasonData';
const mockUseSeasonData = vi.mocked(useSeasonData);

const mockSeason = {
  year: 2026,
  races: [{ round: '1', raceName: 'Australia', hasSprint: false }],
  drivers: ['VER'] as string[],
  constructors: ['RBR'] as string[],
};

const mockDrivers = [
  {
    abbreviation: 'VER',
    displayName: 'Max Verstappen',
    team: 'Red Bull Racing',
    position: 1,
    value: '30.0M',
    seasonTotalPoints: 29,
    percentagePicked: 20,
    races: [
      {
        round: '1',
        raceName: 'Australia',
        totalPoints: 29,
        race: {
          position: 1,
          qualifyingPosition: 1,
          fastestLap: 0,
          overtakeBonus: 0,
          dotd: 0,
        },
        sprint: {
          position: 0,
          qualifyingPosition: 0,
          fastestLap: 0,
          overtakeBonus: 0,
        },
      },
    ],
  },
];

const mockConstructors = [
  {
    abbreviation: 'RBR',
    displayName: 'Red Bull Racing',
    value: '25.0M',
    seasonTotalPoints: 50,
    percentagePicked: 15,
    races: [{ round: '1', raceName: 'Australia', totalPoints: 50 }],
  },
];

function mockLoadedState() {
  mockUseSeasonData.mockReturnValue({
    season: mockSeason,
    drivers: mockDrivers as any,
    constructors: mockConstructors as any,
    loading: false,
    error: null,
  });
}

describe('App', () => {
  it('shows loading state when loading', () => {
    mockUseSeasonData.mockReturnValue({
      season: null,
      drivers: [],
      constructors: [],
      loading: true,
      error: null,
    });

    render(<App />);
    expect(screen.getByText('Loading season data...')).toBeInTheDocument();
  });

  it('shows error message when error is set', () => {
    mockUseSeasonData.mockReturnValue({
      season: null,
      drivers: [],
      constructors: [],
      loading: false,
      error: 'Network failure',
    });

    render(<App />);
    expect(screen.getByText('Error loading data')).toBeInTheDocument();
    expect(screen.getByText('Network failure')).toBeInTheDocument();
  });

  it('shows prices table when data is loaded', () => {
    mockLoadedState();
    render(<App />);

    expect(screen.getByTestId('prices-table')).toBeInTheDocument();
  });

  it('shows season year badge when data is loaded', () => {
    mockLoadedState();
    render(<App />);

    expect(screen.getByText('2026')).toBeInTheDocument();
  });
});
