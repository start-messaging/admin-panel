/** The neutral option every filter select uses to mean "no filter". */
export const NEUTRAL_SELECT = "all";

/**
 * Maps a select's neutral option to "no filter".
 *
 * This lives at the API layer rather than inside `buildQueryString` because
 * only the caller knows which of its parameters is a select. The serializer
 * used to drop *any* value equal to "all", which silently swallowed the search
 * term of anyone who typed the word — the request went out unfiltered and the
 * UI showed every row as if that were the answer.
 */
export function omitNeutral(value: string | undefined): string | undefined {
  return value === NEUTRAL_SELECT ? undefined : value;
}

/**
 * Serialises list parameters into a query string.
 *
 * Drops only absent values. The server validates every parameter it accepts,
 * and an empty `status=` would be a 400 rather than "no status filter", so
 * empty strings are treated as absent too — but a non-empty value is always
 * sent exactly as given, whatever it spells.
 */
export function buildQueryString(params: object): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    search.set(key, String(value));
  }

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
