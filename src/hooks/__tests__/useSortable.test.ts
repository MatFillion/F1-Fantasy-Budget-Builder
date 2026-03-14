import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSortable } from '../useSortable';

interface Item {
  name: string;
  score: number;
}

const items: Item[] = [
  { name: 'Charlie', score: 10 },
  { name: 'Alice', score: 30 },
  { name: 'Bob', score: 20 },
];

function getSortValue(item: Item, field: string): number | string {
  if (field === 'name') return item.name;
  if (field === 'score') return item.score;
  return item.name;
}

describe('useSortable', () => {
  it('sorts by default field (total) descending', () => {
    const { result } = renderHook(() => useSortable(items, getSortValue, 'score', 'desc'));
    const scores = result.current.sorted.map((i) => i.score);
    expect(scores).toEqual([30, 20, 10]);
  });

  it('sorts ascending when default direction is asc', () => {
    const { result } = renderHook(() => useSortable(items, getSortValue, 'score', 'asc'));
    const scores = result.current.sorted.map((i) => i.score);
    expect(scores).toEqual([10, 20, 30]);
  });

  it('sorts by string field alphabetically descending', () => {
    const { result } = renderHook(() => useSortable(items, getSortValue, 'name', 'desc'));
    const names = result.current.sorted.map((i) => i.name);
    expect(names).toEqual(['Charlie', 'Bob', 'Alice']);
  });

  it('toggleSort changes field and defaults to desc', () => {
    const { result } = renderHook(() => useSortable(items, getSortValue, 'score', 'asc'));
    act(() => { result.current.toggleSort('name'); });
    expect(result.current.sortConfig.field).toBe('name');
    expect(result.current.sortConfig.direction).toBe('desc');
  });

  it('toggleSort on same field flips direction', () => {
    const { result } = renderHook(() => useSortable(items, getSortValue, 'score', 'desc'));
    act(() => { result.current.toggleSort('score'); });
    expect(result.current.sortConfig.direction).toBe('asc');
    act(() => { result.current.toggleSort('score'); });
    expect(result.current.sortConfig.direction).toBe('desc');
  });

  it('handles empty items array', () => {
    const { result } = renderHook(() => useSortable([], getSortValue));
    expect(result.current.sorted).toEqual([]);
  });

  it('handles single item', () => {
    const single = [items[0]];
    const { result } = renderHook(() => useSortable(single, getSortValue));
    expect(result.current.sorted).toEqual(single);
  });
});
