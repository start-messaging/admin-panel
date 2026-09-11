import { apiGet } from './api-client';
import type {
  GrowthGranularity,
  GrowthNoteRow,
  GrowthResponse,
  PaginatedResponse,
} from '@/types';

// ── Types ──────────────────────────────────────────────

export interface GrowthParams {
  /**
   * IST calendar day (`YYYY-MM-DD`) or a full ISO instant. A bare day means
   * that whole IST day — `to=2026-07-26` includes the 26th — so the two date
   * inputs on the screen mean what an operator typing them expects.
   */
  from?: string;
  to?: string;
  granularity?: GrowthGranularity;
}

export const GROWTH_NOTES_SORT_FIELDS = [
  'called_at',
  'signed_up_at',
  'name',
  'email',
] as const;

export type GrowthNotesSortBy = (typeof GROWTH_NOTES_SORT_FIELDS)[number];

export interface GrowthNotesParams {
  page?: number;
  limit?: number;
  /**
   * Deliberately a string, not a boolean.
   *
   * The server's ValidationPipe runs with `enableImplicitConversion`, and
   * `Boolean('false')` is `true` — a boolean here would arrive as *enabled*
   * and return exactly the accounts the caller asked to exclude. Send the
   * literal 'true' / 'false', or omit it for both.
   */
  hasNote?: 'true' | 'false';
  /** ISO instant or `YYYY-MM-DD`: only accounts called at or after this. */
  calledSince?: string;
  sortBy?: GrowthNotesSortBy;
  sortOrder?: 'ASC' | 'DESC';
}

// ── API functions ──────────────────────────────────────

/**
 * The whole oversight payload: signup series, verification funnel, calling
 * coverage and reminder email — one request, one window, one `asOf`.
 */
export function getGrowth(params?: GrowthParams): Promise<GrowthResponse> {
  return apiGet<GrowthResponse>('/admin/growth', { params });
}

/**
 * The call notes themselves, paginated.
 *
 * Scoped to accounts the calling team has touched (a logged call OR a note)
 * and NOT to the growth window — the endpoint takes `calledSince`, not
 * from/to, so the screen labels this list as all-time rather than implying it
 * follows the date range above it.
 */
export function getGrowthNotes(
  params?: GrowthNotesParams,
): Promise<PaginatedResponse<GrowthNoteRow>> {
  return apiGet<PaginatedResponse<GrowthNoteRow>>('/admin/growth/notes', {
    params,
  });
}
