/**
 * Item field validation.
 *
 * ## Why this exists separately from `@workspace/api-zod`
 * The generated schemas come from `lib/api-spec/openapi.yaml`. That spec does
 * not (yet) constrain `expiration_date` beyond "string", so a request with
 * `expiration_date: "banana"` passes generated validation, reaches the
 * Postgres `date` column, throws `invalid input syntax for type date`, and
 * surfaces as a 500 instead of a 400.
 *
 * Worse, an unparseable date would silently be classified as **active** by
 * `computeStatus`, because every comparison against `NaN` is false — so a
 * malformed item would be reported as "not expiring". Input must fail closed.
 *
 * These checks are deliberately hand-written rather than expressed as
 * `format: date` in the spec: the Orval config sets `useDates: true` with
 * `coerce.body: ['bigint', 'date']`, so `format: date` would generate
 * `zod.coerce.date()` and hand the repository a `Date` object instead of the
 * `YYYY-MM-DD` string its column expects.
 *
 * @module lib/validation
 */

/** Maximum accepted lengths for item fields (the DB columns are unbounded `text`). */
export const ITEM_LIMITS = {
  title: 200,
  category: 100,
  notes: 5_000,
  /** Applied to the `search` query parameter on `GET /items`. */
  search: 200,
} as const;

/** `YYYY-MM-DD`, four-digit year, zero-padded month and day. */
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True when `value` is a real calendar date in `YYYY-MM-DD` form.
 *
 * Rejects malformed strings (`"banana"`, `"2026-7-1"`) *and* impossible dates
 * (`"2026-02-31"`) that `Date.parse` would silently roll over into March.
 *
 * The calendar check builds the date in UTC and compares its UTC parts back,
 * so it cannot be affected by the server's timezone or DST.
 *
 * @param value - candidate value (may be anything)
 */
export function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_ONLY_RE.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  // Construct in UTC, then apply the year explicitly: `Date.UTC` maps years
  // 0-99 into 1900-1999, which would wrongly reject "0099-01-01".
  const parsed = new Date(Date.UTC(2000, month - 1, day));
  parsed.setUTCFullYear(year);

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/** The subset of an item payload these checks care about. */
export interface ValidatableItemFields {
  title?: string | null;
  category?: string | null;
  notes?: string | null;
  expiration_date?: string | null;
}

/**
 * Validate the shape of an item payload.
 *
 * Only fields that are *present* are checked, so this serves both `POST /items`
 * (where the generated schema has already required `title` and
 * `expiration_date`) and `PATCH /items/:id` (where every field is optional).
 *
 * @param data - parsed request body
 * @returns a human-readable message for the first problem, or `null` if valid
 */
export function findItemFieldError(data: ValidatableItemFields): string | null {
  if (data.expiration_date !== undefined && data.expiration_date !== null) {
    if (!isValidDateOnly(data.expiration_date)) {
      return "expiration_date must be a real date in YYYY-MM-DD format";
    }
  }

  if (typeof data.title === "string" && data.title.length > ITEM_LIMITS.title) {
    return `title must be at most ${ITEM_LIMITS.title} characters`;
  }

  if (typeof data.category === "string" && data.category.length > ITEM_LIMITS.category) {
    return `category must be at most ${ITEM_LIMITS.category} characters`;
  }

  if (typeof data.notes === "string" && data.notes.length > ITEM_LIMITS.notes) {
    return `notes must be at most ${ITEM_LIMITS.notes} characters`;
  }

  return null;
}

/**
 * Escape the LIKE/ILIKE metacharacters in a user-supplied search term.
 *
 * Without this, searching for `%` matches every row and `_` matches any single
 * character — the term stops being literal text and becomes a pattern. The
 * leading/trailing wildcards the repository adds are intentional; the term in
 * between is not.
 *
 * PostgreSQL's default LIKE escape character is a backslash, so prefixing the
 * three metacharacters is enough (no `ESCAPE` clause needed). The value is
 * still passed as a bound parameter, so this is about semantics, not injection.
 *
 * @param term - raw search text from the user
 * @returns the term with `\`, `%`, and `_` escaped
 */
export function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (character) => `\\${character}`);
}