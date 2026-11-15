# Alveary dashboard → Planning App passwordless handoff (architecture decision)

Status: **design/implementation proposal, NOT implemented.** No changes to production login, Webflow, Memberstack configuration, demo users or existing Supabase sessions.

## Requirement

Once a member has signed in at `www.alveary.org` using Memberstack, clicking the Planning App from the authenticated Alveary dashboard should open that member's plan at `plan.alveary.org` **without asking them to enter credentials again**. This must work with default iPhone/iPad Safari privacy settings and in common browsers in the **same browser navigation chain**. We cannot assume cookies or localStorage are shared between the domains or with `auth.memberstack.com`.

Current failure on iPhone and iPad: the dashboard launches `plan.alveary.org/?connect=1`; the app invokes Supabase Auth `signInWithOAuth({provider:'custom:memberstack'})`; Memberstack's hosted auth page displays email/password again. Same desktop incognito flow sometimes skips login. The URL, hostname and login marker have been checked.

## Trust boundary

- **Memberstack**: existing identity provider and source of membership plan status. An authenticated `www.alveary.org` page has access to its current signed JWT through `window.$memberstackDom.getMemberCookie()`. This works for Memberstack installations that keep the website session in origin-local storage; it does not require the Planning App to read that storage.
- **Webflow dashboard browser**: trusted *to present* a member-held token, **not** to assert member IDs or plan eligibility. Only an explicit click starts handoff; no website secret key is placed in Webflow scripts.
- **Supabase Edge Functions**: trusted server verifier. Independently verify the Memberstack RS256 JWT with JWKS, issuer, audience, expiration, and stable member ID; verify live/member-entitlement mapping for the applicable school year and workspace; issue a one-use, very short-lived handoff credential. Store only a hash and binding metadata for redemption. Protect endpoint against abuse/rate-limit; restrict origins and destinations.
- **Planning App**: redeems the handoff credential, establishes an authenticated **planner session** through an audited method, then loads the same private workspace/year plan. Never treat client flags or website URL as authorization.

The *transport* is Webflow browser → trusted backend → Planning App. The *identity proof* is Memberstack → server verification, not Webflow vouching for a member.

## Proposed same-tab handshake

1. Existing dashboard Planning link goes to `https://plan.alveary.org/?connect=1`. If a valid planner session is already present, open normally.
2. Without a planner session, the app generates a cryptographically random `state` and PKCE-style verifier/challenge; holds the secret verifier in `plan.alveary.org` session storage; navigates to a **dedicated, script-enabled page on `www.alveary.org`** with challenge/state and a fixed registered return target.
3. The Webflow handoff page waits for Memberstack DOM readiness. It reads `getMemberCookie()` from the **site's current session** and submits the signed JWT in an HTTPS Authorization header to a new Edge Function. If the website session is absent/expired, send the member back to the Alveary website login, not the hosted Memberstack SSO login.
4. The Edge Function verifies JWT signature and claims (JWKS/iss/aud/sub/exp), verifies a server-side member plan/access rule, and returns a secure random **single-use code** bound to the supplied challenge, state, member, exact destination, and short expiry (e.g. 60 seconds).
5. Webflow navigates **same tab** to the planner callback with only the opaque one-time code and state in the URL fragment (never the Memberstack JWT or any reusable bearer/refresh token). The planner removes the fragment from history immediately, then redeems the code with the verifier.
6. The server consumes the code **atomically** (no parallel reuse), checks expiry/state/challenge/destination and binds the authenticated member ID to the canonical family/year plan. Only then is a planner session established, and the app navigates to the saved plan.
7. Ordinary planner API calls continue to independently check valid session and appropriate current-year entitlements. A cached eligibility assertion must expire rapidly and be revoked promptly when the membership changes.

**Design caveat:** PKCE verifier saved at the planner origin survives the two same-tab navigations; use sessionStorage and verify its behavior in Safari and WebKit. The Webflow page gets only the public challenge, never the secret verifier. Do not use unbounded redirect params or expose JWTs through URL query strings, analytics, logs, or localStorage.

## Critical open architecture choice: Supabase session model

Existing `PlannerAuthProvider`, `memberstack-plan-access`, and `demo-course-planning` require **Supabase Auth** access tokens and bind trusted Memberstack OIDC identities to the existing `member_identity_links` and deterministic workspace ID. A verified Memberstack JWT **is not** automatically a valid Supabase Auth session, and `supabase.auth.setSession()` cannot mint one.

Before building the redeem operation, select and test ONE of these approaches:

**A. Supported native Supabase token acceptance (prefer only if proven viable).** Supabase Custom OIDC third-party auth can accept provider JWTs as data API credentials **only if** issuer/discovery/JWKS constraints and the provider's JWT `role` claim are satisfied. The current diagnostic deliberately reports whether Memberstack tokens carry `role=authenticated`; that was not proven. Third-party tokens do **not** automatically create the existing Supabase Auth user/session. Assess existing identity table and auth impacts before adopting.

**B. First-party planner session via an authenticated backend (likely if A cannot preserve the current model).** After one-time redemption, backend issues a revocable, short-lived planner session with an audited refresh mechanism and maps verified Memberstack identity to the existing workspace *without changing which family owns saved data*. Adapt every private Edge Function to authenticate this session and verify entitlement server-side, not to expect `admin.auth.getUser()` unconditionally. Ideally deliver an HttpOnly/Secure/SameSite first-party session cookie from a `plan.alveary.org` server endpoint (may require moving app hosting to Vercel/another server-backed platform). Static GitHub Pages alone cannot issue HTTP-only first-party cookies. Avoid long-lived bearer or refresh tokens in page URLs, and do not invent a Supabase Auth session.

**Do not** use Webflow member emails/names as proof, static client-side auth bypass, service-role keys in browser, client-side handoff codes that are replayable, or magic-link emails as a silent-login workaround.

## Existing reusable code

- `supabase/functions/memberstack-identity-check/index.ts` already uses `jose jwtVerify` + Memberstack JWKS, issuer `https://api.memberstack.com`, audience our Memberstack app ID, and strict RS256. This is currently a **diagnostic only**, not permission to access private data.
- `supabase/functions/memberstack-plan-access/index.ts` already checks eligible active Memberstack plans and cached entitlement but currently requires an existing Supabase Auth session and `custom:memberstack` identity.
- `app/components/PlannerAuthProvider.tsx` currently invokes hosted Memberstack SSO via Supabase Custom OIDC on `connect=1`. This is the redirect that prompts a second password on the user's devices.
- `supabase/functions/demo-course-planning/index.ts` currently requires both Supabase Auth identity AND current Demo plan eligibility; data binding must remain at least this strict in a replacement.

## Workstream / rollout

1. **Proof of existing website token:** On the authenticated test dashboard, without logging token/PII, confirm Memberstack DOM readiness, non-empty `getMemberCookie()`, and server-side JWT verification. Do it in normal iPhone Safari and iPad Safari. This is the minimum go/no-go for the proposed architecture. Requires a small Webflow handoff-page/button script update by website admin.
2. **Choose session strategy:** Implement a test-only redeem path on the development backend; check preserved OIDC/Supabase user identity and workspace mapping for **existing**, first-time, and staff-test members. Design logout, refresh, expired token, and membership revocation.
3. **Implement short-lived, single-use state/challenge/code and atomic redemption** with explicit test vectors for replay, tamper, expiry, missing token, incorrect audience, wrong return domain, and wrong school-year eligibility.
4. **Integrate only test dashboard link.** Keep the current Supabase hosted SSO fallback while validating. Do not modify production Memberstack scripts or current-year app.
5. **Acceptance:** iPhone/iPad Safari with default privacy settings, desktop Safari/Chrome/Firefox/Edge, normal/private sessions (after signing into the website *within that same private context*), slow/offline/retry/back, browser reload, explicit sign-out, and two members on one device. Verify stored course/student assignments persist, and signed-out users cannot read private endpoints.
6. Only after tests pass should the member-facing rollout and any Vercel/server-host migration occur.

## Official sources (reviewed Nov 15, 2026)
- Memberstack signed token backend verification: https://docs.memberstack.com/hc/en-us/articles/7253255689755-Using-Permissions-and-Token-Verification-to-Secure-Your-Site-on-a-Custom-Backend
- Memberstack Webflow DOM package: https://docs.memberstack.com/hc/en-us/articles/7252361459739-Getting-Started-with-the-Memberstack-DOM-Package
- Supabase custom third-party OIDC requirements, including role claim: https://supabase.com/docs/guides/auth/third-party/custom-oidc
- Supabase custom OAuth login (current hosted behavior): https://supabase.com/docs/guides/auth/custom-oauth-providers
