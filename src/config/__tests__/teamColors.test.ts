import { describe, it, expect } from 'vitest';
import { teamColors, getTeamColor } from '../teamColors';

describe('teamColors', () => {
  it('has exactly 11 entries (all 2026 teams)', () => {
    expect(Object.keys(teamColors)).toHaveLength(11);
  });
});

describe('getTeamColor', () => {
  const expectedPrimary: Record<string, string> = {
    'McLaren':         '#FF8700',
    'Ferrari':         '#E8002D',
    'Red Bull Racing': '#3671C6',
    'Mercedes':        '#27F4D2',
    'Aston Martin':    '#00665E',
    'Alpine':          '#FF63B8',
    'Williams':        '#00A0DD',
    'Racing Bulls':    '#6692FF',
    'Haas':            '#B6BABD',
    'Audi':            '#C0C0C0',
    'Cadillac':        '#1E1E1E',
  };

  it.each(Object.entries(expectedPrimary))(
    '%s returns correct primary color',
    (team, primary) => {
      expect(getTeamColor(team).primary).toBe(primary);
    },
  );

  it('returns fallback for unknown team', () => {
    expect(getTeamColor('Unknown Team')).toEqual({
      primary: '#6B7280',
      secondary: '#4B5563',
      text: '#FFFFFF',
    });
  });

  it('returns fallback for empty string', () => {
    expect(getTeamColor('')).toEqual({
      primary: '#6B7280',
      secondary: '#4B5563',
      text: '#FFFFFF',
    });
  });
});
