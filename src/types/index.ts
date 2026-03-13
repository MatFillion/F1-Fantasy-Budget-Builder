export interface RaceBreakdown {
  position: number;
  qualifyingPosition: number;
  fastestLap: number;
  overtakeBonus: number;
  dotd: number;
}

export interface SprintBreakdown {
  position: number;
  qualifyingPosition: number;
  fastestLap: number;
  overtakeBonus: number;
}

export interface DriverRace {
  round: string;
  raceName: string;
  totalPoints: number;
  race: RaceBreakdown;
  sprint: SprintBreakdown;
}

export interface Driver {
  abbreviation: string;
  displayName: string;
  team: string;
  position: number;
  value: string;
  seasonTotalPoints: number;
  percentagePicked: number;
  races: DriverRace[];
}

export interface ConstructorRace {
  round: string;
  raceName: string;
  totalPoints: number;
}

export interface Constructor {
  abbreviation: string;
  displayName: string;
  value: string;
  seasonTotalPoints: number;
  percentagePicked: number;
  races: ConstructorRace[];
}

export interface RaceInfo {
  round: string;
  raceName: string;
  hasSprint: boolean;
}

export interface Season {
  year: number;
  races: RaceInfo[];
  drivers: string[];       // abbreviations
  constructors: string[];  // abbreviations
}

export type TabId = 'drivers' | 'constructors' | 'prices';
export type SortField = 'name' | 'total' | 'average' | 'price' | string; // string for race round
export type SortDirection = 'asc' | 'desc';
