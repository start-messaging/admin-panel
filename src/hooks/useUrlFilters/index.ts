import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * URL-backed filter state.
 *
 * List views used to hold page/search/sort in `useState`, which meant the view
 * only existed inside one tab's memory: refreshing dropped you back to page 1,
 * the back button skipped the whole list, and there was no way to send someone
 * "the failed messages from last Tuesday". Putting the state in the query
 * string makes each view addressable, so refresh, back/forward, bookmarking and
 * link-sharing all work the way people already expect them to.
 *
 * Values equal to their default are removed from the URL, so the common case
 * stays a clean `/messages` rather than a wall of empty parameters.
 */

export interface ParamCodec<T> {
  defaultValue: T;
  /** Reads a raw query-string value. Returns the default when absent/invalid. */
  parse: (raw: string | null) => T;
  /** Writes a value back out. Return null to omit the key from the URL. */
  serialize: (value: T) => string | null;
}

export function stringParam(defaultValue = ""): ParamCodec<string> {
  return {
    defaultValue,
    parse: (raw) => raw ?? defaultValue,
    serialize: (value) => (value === defaultValue ? null : value),
  };
}

export function numberParam(defaultValue: number): ParamCodec<number> {
  return {
    defaultValue,
    parse: (raw) => {
      // `?page=` (present but empty) has to fall back like an absent key.
      // Number("") is 0, which is finite, so a bare Number() check would
      // return 0 here — and the server's @Min(1) turns that into a 400 for
      // anyone who followed a truncated or hand-edited link.
      if (raw === null || raw.trim() === "") return defaultValue;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : defaultValue;
    },
    serialize: (value) => (value === defaultValue ? null : String(value)),
  };
}

/**
 * Constrains a value to a known set. Anything else falls back to the default,
 * so a hand-edited or stale URL degrades to a sane view instead of sending
 * garbage to the API.
 */
export function enumParam<const T extends readonly string[]>(
  allowed: T,
  defaultValue: T[number],
): ParamCodec<T[number]> {
  return {
    defaultValue,
    parse: (raw) =>
      raw !== null && (allowed as readonly string[]).includes(raw)
        ? (raw as T[number])
        : defaultValue,
    serialize: (value) => (value === defaultValue ? null : value),
  };
}

export function booleanParam(defaultValue = false): ParamCodec<boolean> {
  return {
    defaultValue,
    parse: (raw) => (raw === null ? defaultValue : raw === "true"),
    serialize: (value) => (value === defaultValue ? null : String(value)),
  };
}

/**
 * `ParamCodec<unknown>` will not do here: `parse`/`serialize` make T appear in
 * both input and output positions, so a `ParamCodec<number>` is assignable to
 * neither `ParamCodec<unknown>` nor `ParamCodec<never>`. `any` is the escape
 * hatch for the constraint only — every value read back out is recovered
 * precisely by the `infer` in ValuesOf.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCodec = ParamCodec<any>;

type CodecMap = Record<string, AnyCodec>;

type ValuesOf<S extends CodecMap> = {
  [K in keyof S]: S[K] extends ParamCodec<infer V> ? V : never;
};

export interface SetFiltersOptions {
  /**
   * Replace the current history entry instead of pushing a new one. Use for
   * high-frequency updates (typing in a search box) so one search does not
   * bury the previous page under a dozen back-button steps.
   */
  replace?: boolean;
  /**
   * Skip the automatic reset of `page` to 1. Only needed when changing the
   * page itself; every other filter change should start from page 1.
   */
  keepPage?: boolean;
}

export interface UseUrlFiltersOptions {
  /**
   * Which key holds the page number. Defaults to `page`.
   *
   * Views that paginate more than one list at once (the admin customer detail
   * has messages, transactions and API keys side by side) must give each list
   * its own prefixed key, or paging one would also reset the others.
   */
  pageKey?: string;
}

export function useUrlFilters<S extends CodecMap>(
  schema: S,
  options: UseUrlFiltersOptions = {},
) {
  const pageKey = options.pageKey ?? "page";
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const result = {} as ValuesOf<S>;
    for (const key of Object.keys(schema) as (keyof S)[]) {
      const codec = schema[key] as unknown as ParamCodec<unknown>;
      result[key] = codec.parse(
        searchParams.get(key as string),
      ) as ValuesOf<S>[keyof S];
    }
    return result;
  }, [searchParams, schema]);

  const setFilters = useCallback(
    (patch: Partial<ValuesOf<S>>, setOptions: SetFiltersOptions = {}) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);

          for (const [key, value] of Object.entries(patch)) {
            const codec = schema[key] as unknown as
              | ParamCodec<unknown>
              | undefined;
            if (!codec) continue;

            const serialized = codec.serialize(value);
            if (serialized === null) {
              next.delete(key);
            } else {
              next.set(key, serialized);
            }
          }

          // Changing a filter while on page 7 would otherwise land on a page
          // that no longer exists for the new result set, showing an empty
          // table that looks like "no results".
          if (
            !setOptions.keepPage &&
            !(pageKey in patch) &&
            pageKey in schema
          ) {
            next.delete(pageKey);
          }

          return next;
        },
        { replace: setOptions.replace ?? false },
      );
    },
    [pageKey, schema, setSearchParams],
  );

  /** Clears every managed key, leaving any unmanaged params untouched. */
  const resetFilters = useCallback(
    (setOptions: SetFiltersOptions = {}) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const key of Object.keys(schema)) next.delete(key);
          return next;
        },
        { replace: setOptions.replace ?? false },
      );
    },
    [schema, setSearchParams],
  );

  /**
   * True when any managed filter differs from its default. Page and page size
   * are excluded: being on page 3 is not a filter, and showing a "clear
   * filters" button for it would be misleading.
   */
  const hasActiveFilters = useMemo(
    () =>
      (Object.keys(schema) as (keyof S)[]).some((key) => {
        if (key === pageKey || String(key).toLowerCase().endsWith("limit")) {
          return false;
        }
        const codec = schema[key] as unknown as ParamCodec<unknown>;
        return filters[key] !== codec.defaultValue;
      }),
    [filters, pageKey, schema],
  );

  return { filters, setFilters, resetFilters, hasActiveFilters };
}
