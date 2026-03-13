export interface TeamColor {
  primary: string;
  secondary: string;
  text: string; // contrasting text color for badges
}

export const teamColors: Record<string, TeamColor> = {
  'McLaren':         { primary: '#FF8700', secondary: '#E67800', text: '#000000' },
  'Ferrari':         { primary: '#E8002D', secondary: '#C40026', text: '#FFFFFF' },
  'Red Bull Racing': { primary: '#3671C6', secondary: '#4C8BE3', text: '#FFFFFF' },
  'Mercedes':        { primary: '#27F4D2', secondary: '#00A19B', text: '#000000' },
  'Aston Martin':    { primary: '#00665E', secondary: '#007D73', text: '#FFFFFF' },
  'Alpine':          { primary: '#FF63B8', secondary: '#0090FF', text: '#000000' },
  'Williams':        { primary: '#00A0DD', secondary: '#041E42', text: '#FFFFFF' },
  'Racing Bulls':    { primary: '#6692FF', secondary: '#1634CB', text: '#FFFFFF' },
  'Haas':            { primary: '#B6BABD', secondary: '#E6002B', text: '#000000' },
  'Audi':            { primary: '#C0C0C0', secondary: '#FF1E1E', text: '#000000' },
  'Cadillac':        { primary: '#1E1E1E', secondary: '#C0C0C0', text: '#FFFFFF' },
};

export function getTeamColor(team: string): TeamColor {
  return teamColors[team] ?? { primary: '#6B7280', secondary: '#4B5563', text: '#FFFFFF' };
}
