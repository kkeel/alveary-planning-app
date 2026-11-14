# Authentication and performance guardrails

## Sign-in is not the same as membership permission

Memberstack Custom OIDC provides identity. Supabase Auth owns the browser session and refreshes JWTs automatically. Supabase permissions are scoped to a school year, plan kind (Demo vs annual member), workspace type and capability. Browser cookies and user-editable metadata never authorize private data.

The Planning App currently enables Memberstack cross-subdomain cookies (useCookies and setCookieOnRootDomain) and configures Supabase JS with persistSession and autoRefreshToken. This change does not migrate Supabase sessions to cookies or alter the live Webflow authentication.

## Implemented server-side entitlement cache

The memberstack-plan-access Edge Function first authenticates the caller with Supabase Auth and matches the server-held Memberstack OIDC identity to the exact Alveary application. It then calls a service-only, invoker-rights database function to look for a *positive* Memberstack plan verification made within the past 2 minutes. The cache is bound to the exact member, Supabase Auth user, plan, school year, plan kind, workspace type, and capability.

The cache check joins the current enabled plan-access rules. Stale, expired, invalidated, disabled-rule and wrong-account cache records never authorize the request. On a miss or expiry the function rechecks Memberstack through the Admin API and, if ACTIVE, stores a new 2-minute permission. It invalidates old positive entries on a fresh denial. If the source-of-truth lookup fails after expiry, the function fails closed and never authorizes by browser-side assumptions.

The cache table has RLS, no policies for browser access, and only service_role permissions. Its lookup RPC is SECURITY INVOKER and EXECUTE is explicitly denied to PUBLIC, anon and authenticated. The 5-minute database cap is a maximum safeguard, not the currently configured TTL.

**Revocation risk before webhooks:** a recently verified Memberstack plan can continue granting private access for at most approximately 2 minutes after its source plan changes. This is a bounded, deliberate initial window. No live 2026–27 access or user account data was changed.

## Next security/scale improvement: Memberstack webhooks

Set up a Live Memberstack Dev Tools webhook for plan additions/updates/cancellations and member deletion. It must verify the exact Svix signature over the *raw request body*, with timestamp and replay protections. Process events idempotently; invalidate cache entries for a trusted member and affected plan. Handle out-of-order events so an older grant cannot undo newer revocation. Webhook delivery can be delayed or fail, so the periodic source API check remains mandatory. Only then consider increasing the TTL to 5 minutes.

The endpoint signing secret and webhook setup require deliberate Memberstack dashboard configuration. Do not put secrets in GitHub, the browser or chat.

## Architecture for Courses, Books, Supplies and Scheduling

- Keep a single app-wide, user- and plan-scoped workspace store for last-verified member data. Do not reload each page's students and selections from scratch or overwrite visible lists while silently refreshing.
- Load a small family planning summary after first authorization. Lazy-load larger books/supplies/course detail sets only when useful.
- Continue optimistic updates with visible pending/error state and rollback. Make backend mutations idempotent for safe retries.
- Combine related private database operations into atomic backend calls; avoid multiple serial requests and avoid external Memberstack lookups per planning sub-operation.
- Prefetch likely Next.js routes and public-versioned catalog assets selectively, not all personalized data at once.
- Cache only public, versioned static curriculum resources on the CDN. Private API responses remain Cache-Control: no-store.
- Reuse browser-tab memory only while the viewer is verified. Explicitly discard private app data on logout, identity change or access revocation.
- Instrument first-login time, warm navigation, API latency p50/p95/p99, Memberstack lookup count and cache hit rate, and failures. Avoid member IDs, child names and email addresses in diagnostic logs.

### Proposed measurable budgets (targets, not guarantees)

- Return to already loaded private page: immediate content, target under 100 ms.
- Optimistic update feedback: under 100 ms.
- Warm private API p95: target under 1 second; verify under realistic peak load.
- First authorized workspace load after SSO: target p95 under 2.5 seconds.
- No per-checkbox or per-bookmark Memberstack Admin API requests.

For each future feature PR, measure request counts and private data access, and test both authorized and unauthorized paths. Review scaling and Supabase costs well before the June-August member-planning peak.
