# Memberstack access mapping and separate Demo planning channel

**Status November 14, 2026:** database foundation deployed to Alveary Planning – Development. No Memberstack plan IDs have been mapped, and no real member access has been granted.

## Data distinction

One year plan is identified by workspace, catalog school year, and plan kind. A Demo plan is tagged `plan_kind='demo'`, can reference the same 2027–28 approved curriculum release, but cannot be confused with the separate `plan_kind='member'` 2027–28 plan. Demo is **not** an invented academic calendar year. Year-specific student grade records remain attached to their actual yearly plan. Historical plans are never silently migrated or overwritten.

The `memberstack_plan_access_rules` table permits an admin-configured mapping from a verified Memberstack plan ID to Demo/real planning capabilities and school year; it is initially empty and disabled by default. A future 2027–28 basic-plan mapping can be enabled alongside, or instead of, the Demo tester mapping without rewriting the schema. Test-plan entitlements must never become real-year entitlements just because the catalog release is the same.

**Identity first, permissions second.** Existing Memberstack account IDs must be verified from a signed token or secure server-side Memberstack API exchange. Supabase currently uses custom OAuth/OIDC sign-in with an unverified Memberstack email; this has produced unwanted Supabase verification emails. Do not disable global email security or treat account email as the primary key.

## Authentication direction and open compatibility check

- Memberstack's July 2026 token guide documents RS256 JWTs, `https://auth.memberstack.com/jwks`, issuer `https://api.memberstack.com`, application audience verification and the signed `sub` member ID.
- Supabase's October 2026 Custom OIDC third-party auth guide supports externally issued RS256 JWTs via an OIDC discovery endpoint **only when the JWT includes a `role` claim** (normally `authenticated`). We have not confirmed that Memberstack's ordinary member token supports supplying that claim or that the issuer and discovery URLs match the exact validated token.
- Before switching the authentication model, inspect a **redacted, non-secret claim/header inventory** on a trusted backend (never share the token), check the OIDC discovery issuer, and verify the secure scope of the Memberstack cookie on the Alveary domain. If third-party auth does not accept the issued token, use a reviewed backend verification/exchange approach; do not bypass JWT verification or expose a signing secret in the static app.
- Live access requires current Memberstack plan verification/reconciliation with expiry, revoked status, and change propagation, plus negative tests for visitor/nonmember, test-only, paid 2027–28, school-only and mixed-account roles.
- The visible Planning mode implemented in PR #30 is a **signed-in preview**, not paid-plan authorization. It must be replaced by verified entitlement checks before claiming member restriction is complete.

Sources:
- https://docs.memberstack.com/hc/en-us/articles/7253255689755-Using-Permissions-and-Token-Verification-to-Secure-Your-Site-on-a-Custom-Backend
- https://supabase.com/docs/guides/auth/third-party/custom-oidc
