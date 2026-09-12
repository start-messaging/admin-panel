/**
 * Which deployment this bundle is running on.
 *
 * Read from the hostname at runtime rather than from a build-time variable of
 * its own, because a variable is the exact failure mode this codebase already
 * hit: PostHog ran dark on staging for months while the workflow passed
 * `vars.STAGING_POSTHOG_KEY` into a build that reads `VITE_POSTHOG_KEY`, and an
 * unset `vars.X` expands to an empty string without failing anything.
 *
 * `import.meta.env.MODE` is not an alternative. Vite sets it to 'production'
 * for every `vite build`, staging builds included, so it cannot tell the two
 * apart — which is exactly why Sentry's `environment` was wrong before this
 * existed.
 *
 * Sentry is the only consumer in this app: it refuses to initialise unless this
 * returns 'production' (instrument.ts). The sibling dashboard also stamps the
 * value onto every PostHog event, which is why the reasoning above is about a
 * variable — this panel deliberately sends no product analytics at all.
 *
 * `stage-` is tested before the production suffix on purpose. The staging hosts
 * are stage-admin/stage-app.startmessaging.com, so they also end in
 * `startmessaging.com` — the same substring trap that made the staging deploy
 * guard match every bundle until it was anchored on the scheme.
 */
export type DeploymentEnvironment = 'production' | 'staging' | 'development';

export function deploymentEnvironment(host: string): DeploymentEnvironment {
  if (host.startsWith('stage-')) return 'staging';
  if (host === 'startmessaging.com' || host.endsWith('.startmessaging.com')) {
    return 'production';
  }
  return 'development';
}
