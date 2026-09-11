import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getGrowthNotes,
  GROWTH_NOTES_SORT_FIELDS,
  type GrowthNotesSortBy,
} from '@/apis/growth.api';
import { adminQueryKeys } from './admin-query-keys';
import {
  enumParam,
  numberParam,
  stringParam,
  useUrlFilters,
} from '@/hooks/useUrlFilters';

const DEFAULT_LIMIT = 20;

/** Tri-state, as a string: the API's `hasNote` cannot be a boolean. See growth.api.ts. */
export const NOTES_SCOPE_OPTIONS = ['all', 'true', 'false'] as const;

export type NotesScope = (typeof NOTES_SCOPE_OPTIONS)[number];

/**
 * Prefixed keys because this list shares a URL with the growth window control
 * above it. A bare `page` would also be the page key of anything else added to
 * the screen later, and paging the notes would jump that too.
 */
const NOTES_FILTER_SCHEMA = {
  notesPage: numberParam(1),
  notesLimit: numberParam(DEFAULT_LIMIT),
  notesScope: enumParam(NOTES_SCOPE_OPTIONS, 'all'),
  notesSince: stringParam(''),
  notesSortBy: enumParam(GROWTH_NOTES_SORT_FIELDS, 'called_at'),
  notesSortOrder: enumParam(['ASC', 'DESC'] as const, 'DESC'),
} as const;

/**
 * The call notes as rows to read, not a number to admire.
 *
 * Independent of the growth window on purpose: the endpoint filters on
 * `calledSince`, not on when the account signed up, so tying it to the graph's
 * date range would quietly answer a different question. The screen says so in
 * words next to the list.
 */
export function useAdminGrowthNotes() {
  const { filters, setFilters, resetFilters, hasActiveFilters } = useUrlFilters(
    NOTES_FILTER_SCHEMA,
    { pageKey: 'notesPage' },
  );

  const query = useQuery({
    queryKey: adminQueryKeys.growthNotes(filters),
    queryFn: () =>
      getGrowthNotes({
        page: filters.notesPage,
        limit: filters.notesLimit,
        hasNote:
          filters.notesScope === 'all'
            ? undefined
            : (filters.notesScope as 'true' | 'false'),
        calledSince: filters.notesSince || undefined,
        sortBy: filters.notesSortBy as GrowthNotesSortBy,
        sortOrder: filters.notesSortOrder,
      }),
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters,
    setScope: (notesScope: NotesScope) => setFilters({ notesScope }),
    setSince: (notesSince: string) => setFilters({ notesSince }),
    setSort: (notesSortBy: GrowthNotesSortBy, notesSortOrder: 'ASC' | 'DESC') =>
      setFilters({ notesSortBy, notesSortOrder }),
    setPage: (notesPage: number) => setFilters({ notesPage }, { keepPage: true }),
    setLimit: (notesLimit: number) => setFilters({ notesLimit }),
  };
}
