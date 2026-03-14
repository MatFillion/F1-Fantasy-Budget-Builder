interface SortConfig {
  field: string;
  direction: string;
}

/**
 * Displays a sort-direction arrow for sortable column headers.
 * Shows a dim inactive arrow when the column is not currently sorted,
 * and a bright active arrow (▲/▼) when it is.
 */
export function SortArrow({ field, sortConfig }: { field: string; sortConfig: SortConfig }) {
  if (sortConfig.field !== field) return <span className="ml-1 text-gray-600">▲</span>;
  return <span className="ml-1 text-gray-300">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
}
