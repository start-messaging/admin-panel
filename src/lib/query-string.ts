/**
 * Serialises list parameters into a query string.
 *
 * Drops empty values and the "all" sentinel the filter selects use for their
 * neutral option, so those never reach the API as a real filter. The server
 * validates every parameter it accepts, and an empty `status=` would be a 400
 * rather than "no status filter".
 */
export function buildQueryString(params: object): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === "all"
    ) {
      continue;
    }
    search.set(key, String(value));
  }

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
