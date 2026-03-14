import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import PricesTable from '../PricesTable';
import type { Driver, Constructor, RaceInfo } from '../../types';

const tierADriver: Driver = {
  abbreviation: 'VER',
  displayName: 'Max Verstappen',
  team: 'Red Bull Racing',
  position: 1,
  value: '30.0M',
  seasonTotalPoints: 200,
  percentagePicked: 50,
  races: [
    {
      round: '1',
      raceName: 'Bahrain GP',
      totalPoints: 40,
      race: { position: 1, qualifyingPosition: 1, fastestLap: 1, overtakeBonus: 0, dotd: 0 },
      sprint: { position: 0, qualifyingPosition: 0, fastestLap: 0, overtakeBonus: 0 },
    },
  ],
};

const tierBDriver: Driver = {
  abbreviation: 'ALB',
  displayName: 'Alexander Albon',
  team: 'Williams',
  position: 15,
  value: '10.0M',
  seasonTotalPoints: 30,
  percentagePicked: 5,
  races: [
    {
      round: '1',
      raceName: 'Bahrain GP',
      totalPoints: 5,
      race: { position: 14, qualifyingPosition: 12, fastestLap: 0, overtakeBonus: 0, dotd: 0 },
      sprint: { position: 0, qualifyingPosition: 0, fastestLap: 0, overtakeBonus: 0 },
    },
  ],
};

const tierAConstructor: Constructor = {
  abbreviation: 'RBR',
  displayName: 'Red Bull Racing',
  value: '25.0M',
  seasonTotalPoints: 300,
  percentagePicked: 40,
  races: [{ round: '1', raceName: 'Bahrain GP', totalPoints: 60 }],
};

const tierBConstructor: Constructor = {
  abbreviation: 'WIL',
  displayName: 'Williams',
  value: '8.0M',
  seasonTotalPoints: 20,
  percentagePicked: 3,
  races: [{ round: '1', raceName: 'Bahrain GP', totalPoints: 4 }],
};

const races: RaceInfo[] = [
  { round: '1', raceName: 'Bahrain GP', hasSprint: false },
];

const defaultProps = {
  drivers: [tierADriver, tierBDriver],
  constructors: [tierAConstructor, tierBConstructor],
  races,
};

function getTierContainer(label: RegExp) {
  const heading = screen.getByText(label);
  // The heading and its sibling table are wrapped in a parent div
  return heading.closest('div')!.parentElement!;
}

describe('PricesTable', () => {
  it('renders driver abbreviations', () => {
    render(<PricesTable {...defaultProps} />);
    expect(screen.getByText('VER')).toBeInTheDocument();
    expect(screen.getByText('ALB')).toBeInTheDocument();
  });

  it('shows Tier A and Tier B labels', () => {
    render(<PricesTable {...defaultProps} />);
    expect(screen.getByText(/Tier A/)).toBeInTheDocument();
    expect(screen.getByText(/Tier B/)).toBeInTheDocument();
  });

  it('Tier A table has +0.3 and +0.1 headers; Tier B has +0.6 and +0.2', () => {
    render(<PricesTable {...defaultProps} />);

    const tierA = getTierContainer(/Tier A/);
    const tierAHeaders = within(tierA).getAllByRole('columnheader').map((th) => th.textContent);
    expect(tierAHeaders).toContain('+0.3');
    expect(tierAHeaders).toContain('+0.1');

    const tierB = getTierContainer(/Tier B/);
    const tierBHeaders = within(tierB).getAllByRole('columnheader').map((th) => th.textContent);
    expect(tierBHeaders).toContain('+0.6');
    expect(tierBHeaders).toContain('+0.2');
  });

  it('shows Drivers and Constructors section text', () => {
    render(<PricesTable {...defaultProps} />);
    const driversSections = screen.getAllByText('Drivers');
    const constructorsSections = screen.getAllByText('Constructors');
    expect(driversSections.length).toBeGreaterThanOrEqual(2);
    expect(constructorsSections.length).toBeGreaterThanOrEqual(2);
  });

  it('Tier A driver appears in Tier A table, not in Tier B', () => {
    render(<PricesTable {...defaultProps} />);

    const tierA = getTierContainer(/Tier A/);
    const tierB = getTierContainer(/Tier B/);

    expect(within(tierA).getByText('VER')).toBeInTheDocument();
    expect(within(tierB).queryByText('VER')).not.toBeInTheDocument();
  });

  it('Tier B driver appears in Tier B table, not in Tier A', () => {
    render(<PricesTable {...defaultProps} />);

    const tierA = getTierContainer(/Tier A/);
    const tierB = getTierContainer(/Tier B/);

    expect(within(tierB).getByText('ALB')).toBeInTheDocument();
    expect(within(tierA).queryByText('ALB')).not.toBeInTheDocument();
  });
});
