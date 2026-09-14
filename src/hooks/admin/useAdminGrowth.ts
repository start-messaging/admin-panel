import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getGrowth } from '@/apis/growth.api';
import { adminQueryKeys } from './admin-query-keys';
import {
  enumParam,
  stringParam,
  useUrlFilters,
} from '@/hooks/useUrlFilters';
import type { GrowthGranularity } from '@/types';

export const GROWTH_GRANULARITIES = ['day', 'week'] as const;

/**
 * Module-level so `useUrlFilters` can memoise on a stable identity.
 *
 * Empty strings rather than a computed default window: the server owns "the
 * last 30 IST days", and baking today's date into the URL here would mean two
 * people opening the same bookmark on different days silently read different
 * reports while the link claims otherwise.
 */
const GROWTH_FILTER_SCHEMA = {
  from: stringParam(''),
  to: stringParam(''),
  granularity: enumParam(GROWTH_GRANULARITIES, 'day'),
} as const;

/**
 * The signups / funnel / calling / email payload for one window.
 *
 * The window lives in the URL so a range someone found worth looking at is a
 * link rather than a set of instructions, and so a refresh does not silently
 * snap back to the default 30 days.
 */
export function useAdminGrowth() {
  const { filters, setFilters, resetFilters, hasActiveFilters } =
    useUrlFilters(GROWTH_FILTER_SCHEMA);

  const query = useQuery({
    queryKey: adminQueryKeys.growth(filters),
    queryFn: () =>
      getGrowth({
        from: filters.from || undefined,
        to: filters.to || undefined,
        granularity: filters.granularity,
      }),
    // Keeps the current report on screen while a new range loads, so changing
    // the dates does not blank four sections at once.
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters,
    setWindow: (from: string, to: string, granularity?: GrowthGranularity) =>
      setFilters(
        granularity ? { from, to, granularity } : { from, to },
      ),
    setGranularity: (granularity: GrowthGranularity) =>
      setFilters({ granularity }),
  };
}
