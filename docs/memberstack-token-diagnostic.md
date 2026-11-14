# Memberstack token verification — development diagnostic

**Purpose:** confirm the current signed Memberstack member token can be independently verified by Supabase before changing the app's authentication implementation.

This function checks Memberstack RS256 signature against its JWKS, the issuer `https://api.memberstack.com`, the Alveary application audience, expiry and nonempty subject. It returns whether the verified token contains the `role: authenticated` claim required for direct Supabase Custom OIDC. It never returns token contents, email or private member data, creates a user, or grants a planning permission.

Source: `supabase/functions/memberstack-identity-check/index.ts`. Development endpoint: `https://fzitmrzuxxdmvrhftdkr.supabase.co/functions/v1/memberstack-identity-check`.

The function is deployed with Supabase's **verify JWT off** because the incoming Bearer token is from Memberstack, not from Supabase; it authenticates by cryptographic verification using Memberstack's public keys. Requests without a valid signed token must receive 401.

**This is NOT the member entitlement adapter:** current Testing Plan status and expiration must be verified using a trusted Memberstack server request or appropriately trusted, fresh claims before allowing member tables or restricted content. No Supabase RLS policies for private member records have been opened.

## Next integration test
1. On `plan.alveary.org`, obtain the Memberstack token from the actual Alveary session via the documented Memberstack DOM SDK or appropriately configured root-domain session cookie. Never display the raw token, include it in a URL, paste it into chat, or log it.
2. Send an HTTPS POST with `Authorization: Bearer <Memberstack JWT>` from the frontend to the diagnostic endpoint, using the same browser context signed in at Alveary.
3. Verify a valid token yields `verified: true`, a fake/expired/missing token returns 401, and the role-compatibility boolean determines whether direct Custom OIDC is feasible.
4. If no session token can be obtained from the planner subdomain, investigate Memberstack root-domain cookie configuration and same-site behavior rather than adding a second sign-in.
5. After testing, build a separate server-side plan verification/reconciliation handler and only then enable verified Demo entitlement rules and private RLS.

Sources: https://docs.memberstack.com/hc/en-us/articles/7253255689755-Using-Permissions-and-Token-Verification-to-Secure-Your-Site-on-a-Custom-Backend and https://supabase.com/docs/guides/auth/third-party/custom-oidc

## Browser-to-Supabase diagnostic now implemented

The browser uses the hosted Memberstack 2 script with the approved Alveary application ID. An inline configuration is installed before the SDK to request `useCookies: true` and `setCookieOnRootDomain: true` on the planner subdomain. The temporary **Check Alveary connection** button reads the signed member token through `window.$memberstackDom.getMemberCookie()` and POSTs it to the verification function using an Authorization header. It stores no raw token, displays no email or member ID and never uses member identity to access protected records.

**Important prerequisite on the Webflow root website:** Memberstack's official cross-domain instructions require the same cookie options to be configured *before* the existing Memberstack installation script on `www.alveary.org` as well. Merely configuring this in the Next.js subdomain cannot retroactively share a login that was stored in the website's own localStorage or as a host-only cookie. After updating Webflow, publish and log out/in on the Alveary website before testing the existing test-dashboard link in the same browser context.

The diagnostic intentionally does not change the current Supabase OAuth sign-in or the public/signed-in preview toggles. Seeing `identity verified` does **not** grant a Demo membership, load records, or suppress an OAuth verification email until we replace the old login after entitlement verification.

Source: https://docs.memberstack.com/hc/en-us/articles/18004875142555-Enable-Cross-Domain-Login-with-Memberstack
