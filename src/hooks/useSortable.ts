import { useState, useMemo } from 'react';
import type { SortDirection } from '../types';

interface SortConfig {
  field: string;
  direction: SortDirection;
}

export function useSortable<T>(
  items: T[],
  getSortValue: (item: T, field: string) => number | string,
  defaultField: string = 'total',
  defaultDirection: SortDirection = 'desc'
) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: defaultField,
    direction: defaultDirection,
  });

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const aVal = getSortValue(a, sortConfig.field);
      const bVal = getSortValue(b, sortConfig.field);

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortConfig.direction === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
    return copy;
  }, [items, sortConfig, getSortValue]);

  function toggleSort(field: string) {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  }

  return { sorted, sortConfig, toggleSort };
}
