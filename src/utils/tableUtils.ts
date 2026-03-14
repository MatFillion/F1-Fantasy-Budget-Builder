/** Point threshold above which a race score is coloured green (exclusive). */
export const POINT_COLOR_HIGH = 30;
/** Point threshold above which a race score is coloured yellow (inclusive). */
export const POINT_COLOR_MID = 15;
/** Point threshold above which a race score is coloured neutral (inclusive). */
export const POINT_COLOR_LOW = 5;

/** Returns a Tailwind text-colour class based on fantasy points scored. */
export function pointColorClass(pts: number): string {
  if (pts > POINT_COLOR_HIGH) return 'text-green-400';
  if (pts >= POINT_COLOR_MID) return 'text-yellow-400';
  if (pts >= POINT_COLOR_LOW) return 'text-gray-100';
  return 'text-red-400';
}
