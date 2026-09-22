/**
 * Postgres SSL settings.
 *
 * ## Why this is explicit
 * The previous rule was "any non-localhost URL gets `rejectUnauthorized: false`",
 * which quietly disabled certificate verification for **every** deployed
 * database — leaving the API→database hop open to interception. Managed
 * providers occasionally do present chains Node's CA bundle does not know, so
 * opting out is still possible, but it now has to be a deliberate deployment
 * decision (`DATABASE_SSL_REJECT_UNAUTHORIZED=false`).
 *
 * @module ssl
 */

/** The `ssl` option accepted by `pg`'s `Pool`. */
export type PgSslOption = false | { rejectUnauthorized: boolean };

/** Hosts for which TLS is pointless because the connection never leaves the box. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * True when the connection string points at the local machine.
 *
 * Parses the URL rather than substring-matching, so a remote host such as
 * `localhost.example.com` is correctly treated as remote.
 *
 * @param connectionString - Postgres connection URL
 */
export function isLocalDatabaseHost(connectionString: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(connectionString).hostname);
  } catch {
    // Unparseable URL: assume remote, which keeps TLS verification on.
    return false;
  }
}

/**
 * Decide the `ssl` option for the connection pool.
 *
 * @param connectionString - Postgres connection URL
 * @param rejectUnauthorizedEnv - raw `DATABASE_SSL_REJECT_UNAUTHORIZED` value
 * @returns `false` for local hosts, otherwise a verification setting that
 *   defaults to **enabled**
 */
export function resolveSslConfig(
  connectionString: string,
  rejectUnauthorizedEnv: string | undefined,
): PgSslOption {
  if (isLocalDatabaseHost(connectionString)) {
    return false;
  }

  return { rejectUnauthorized: rejectUnauthorizedEnv !== "false" };
}