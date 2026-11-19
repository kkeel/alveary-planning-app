# Alveary Planning — single-sign-on and membership authorization architecture
**Status:** implementation plan (pilot is not a member-wide release)  
**Primary entry:** `https://alveary.org/alveary-2027-2028/dashboard-test` → existing Planning App button  
**Existing dashboard link:** `https://plan.alveary.org/?connect=1`  
**Future entry:** installed PWA/Home Screen shortcut; public catalog browsing does not need auth.

## Member-facing acceptance criteria
1. A member signs into the Alveary website **once** through Memberstack.
2. Clicking **Planning App** initiates the handoff *on the already authenticated dashboard*, without returning to the protected dashboard or prompting for a second website login.
3. The planner may show **Gathering your planner…** as a calm transition.
4. Backend verifies the signed Memberstack ID and currently ACTIVE eligible-year plan independently of the button's visibility.
5. First eligible visit provisions a durable Supabase Auth identity **mapped by Memberstack ID**, plus the correct canonical family workspace and year plan. A returning visit reuses existing records.
6. Existing OIDC and pilot Auth identities must resolve to the same family workspace, even if multiple `auth.users` rows exist during the migration. **Do not match or merge by email**.
7. Public Course List/Book List/Supplies are available anonymously; the personal planning capabilities and sensitive data are not.
8. Saved app icon: use a verified active planner session when available; otherwise reconnect through the same Alveary Memberstack account. Test Safari standalone storage behavior separately.

## Current working components (Nov 19 2026)
- Webflow has a page-specific `Before </body>` script documented in `docs/webflow-dashboard-passwordless-handoff.md`. It **only** triggers on `alveary_handoff_state` and `alveary_handoff_challenge` query params; current handoff causes a round-trip to the protected dashboard and may trigger its redirect to public homepage.
- `supabase/functions/memberstack-handoff-proof/index.ts`: validates signed Memberstack JWT using member signing JWKS, and ACTIVE 2027–28 Testing Plan. Issues opaque 60-second single-use code bound to PKCE challenge; backend atomically consumes it. Only preapproved accounts in `memberstack_handoff_test_accounts` can redeem; synthetic email magiclink exchange **is pilot-only**.
- `memberstack-plan-access`, `demo-students`, `demo-course-planning` independently validate Supabase Auth, the mapped Memberstack identity and the live current-year plan. Existing student/course-planning APIs derive deterministic canonical family workspace UUID from verified Memberstack ID; multiple legacy auth identities share workspace.
- `memberstack_plan_access_rules` currently enables only Testing Plan for `2027-28/family/planning`. The three official launch memberships are staged disabled by migration `20261119161000_register_2027_member_plans_disabled.sql`.

## Plan mapping (never enable by default)
| Memberstack plan | Workspace | Stage |
| --- | --- | --- |
| `pln_testing-plan-vybk04zq` | family | Existing enabled development pilot |
| `pln_alveary-membership-2027-2028-1a3g0ppr` | family | Launch-disabled |
| `pln_alveary-membership-2027-2028--hh6l0f3n` | family | Launch-disabled; Alveary+ additional capabilities separate |
| `pln_alveary-school-license-2027-2028--kt6m0fpm` | school | Disabled; school ownership/admin/teachers not designed yet |

Entitlement rules have independent `school_year`, `plan_kind`, `workspace_type`, `capability`, and `enabled` fields. The UI's testers/active members/public variants are **capabilities**, not separate copies of page data or grounds for bypassing backend authorization. Testing Plan does not implicitly grant all unreleased paid lesson content.

## Design and implementation gates

### Gate A — secure click-origin handoff
A website button handler may start the exchange only after verifying the existing signed Memberstack session. A cross-origin handshake must retain origin-scoped unpredictable state and a PKCE verifier on the planner side (or another equivalently robust proof-of-possession protocol) **before** issuing the one-time code. Do not send Memberstack JWTs, Supabase session tokens, or a code **together with its PKCE verifier** through redirect URLs. Cross-window `postMessage` designs must check exact origins and per-request state; cross-site iframe/storage designs must be tested on iPad Safari and installed PWAs before selection. Retain the known-good test flow until same-tab success is proven. No changes to global Webflow scripts or the 2026–27 site.

### Gate B — email-independent Auth identity provisioning
Provisioning must use the verified **Memberstack ID plus app ID**, never an email as the identity match or claim of ownership. Identity creation and canonical workspace connection must be idempotent under concurrent first visits. Preserve existing OIDC and pilot account links; no overwriting existing verified links or moving family data between unrelated members. Choose and verify a supported Supabase session mechanism that does not require members to verify a second email or enter a second password. The current magiclink-to-synthetic-email trick is **not** a production-ready account/session design. Include safely bounded reconciliation for legacy identities.

### Gate C — account lifecycle and authorization
Private API checks must validate a genuine Supabase session and its server-trusted Memberstack mapping, then re-evaluate active eligibility (with explicitly bounded cache). Plan cancellation, changes, disabled rule, expired sessions, and mismatching Memberstack IDs must fail closed; preserve records across years. Validate direct URLs and API calls independently of Webflow gated content. School plans must not create a family workspace merely to make sign-in succeed.

### Gate D — rollout testing
- New Testing Plan member with no Supabase auth row: creates *one* identity/workspace; repeated and concurrent click opens same records.
- Returning tester: opens original students, assignments and planning data.
- Existing OIDC/pilot Auth user: converges on correct canonical Memberstack workspace without email lookup.
- Wrong/no plan, revoked plan, inactive plan, expired website session, invalid JWT, replayed/expired code: no private access and clear recovery.
- iPhone Safari, iPad Safari, Chrome Incognito, cross-device, cleared history, and installed iOS PWA entry.
- Public Course/Book/Supplies browsing never starts a personal-planner authentication flow.
- Only after acceptance, review and deliberately enable regular 2027–28 rules. School workspace access has its own approval milestone.

## Work sequencing
1. Stage disabled 2027–28 rule rows + acceptance architecture (this PR).
2. Implement first-time and returning member provisioning plus session issuance behind strict tester-only access; test legacy identities and concurrency.
3. Implement dashboard-click handoff; one tested page-specific replacement for Kathryn; preserve current pilot until verified.
4. Generalize entitlement/feature gates and launch switch; protect all private API functions.
5. PWA install/reconnect and retire obsolete OAuth/test-only paths after migration and security review.

## Operational guardrails
- No Webflow code updates until reviewed replacement and rollback path are ready.
- Do not copy member JWTs, token hashes, email addresses, or secrets into telemetry, URLs or public app assets.
- Maintain GitHub Pages + Supabase; no Vercel or paid custom domain required.
- Never modify the 2026–27 app on `planning.alveary.org`.


## Staged first-time tester provisioning — PR after launch rule staging

The `memberstack-handoff-proof` Edge Function has an **off-by-default**
server-side switch `MEMBERSTACK_TEST_AUTO_PROVISION_ENABLED`. Do not set
it until the schema migration and function deployment are complete and the
security review/test account is ready.

When enabled, only an ACTIVE 2027–28 **Testing Plan** member whose signed
Memberstack JWT passed JWKS verification may start the PKCE handoff.
On redeem, the one-time PKCE code is **atomically consumed** and the active
Testing Plan rechecked before account creation can occur.

- An existing service-only `memberstack_handoff_test_accounts` mapping
  is always reused, including existing manually provisioned pilot identities.
- For a new Memberstack ID, a single permanent unique claim is inserted in
  `memberstack_tester_provisioning_claims`; concurrent or failed attempts
  **never automatically steal an existing claim**. Operations requiring
  recovery fail closed until an operator examines the Auth and mapping records.
- A Supabase Auth user is created server-side with an opaque non-deliverable
  internal address under `auth.alveary.invalid`, app metadata restricted to
  the signed website handoff, and without member-facing verification emails.
  **The email is merely a limitation of this temporary session adapter.**
  Memberstack ID controls account selection; member emails are not consulted.
- Backend binds the created Auth UUID to the verified Memberstack ID, then
  generates a single-use Auth exchange for a renewable Supabase session.
  Existing private Edge Functions still validate the signed Supabase caller,
  the exact server-only mapping, the unchanged account email binding, and the
  live Memberstack Testing Plan; student/course workspace UUIDs still derive
  from the Memberstack ID.
- The new claim table and internal email adapter are **not the production
  session design**. Before broad release, use an audited session mechanism
  that removes the possibility of email-provider account recovery, proves
  revocation behavior, and reconciles prior OIDC Auth identities.

**Rollout checklist:** merge migration and code, apply claim-table migration
in development, deploy the updated Edge Function, check existing pilot sign-in
unchanged with the switch absent, then explicitly enable the tester switch
only after a fresh Testing Plan member is available for the test. Verify
new tester first access, same member second access, concurrent taps,
incorrect plans, expiry, revoke, and existing pilot data. Leave all 2027–28
production Basic/Plus/School grants disabled and keep Kathryn's Webflow
script unchanged during this stage.

**Recovery:** a failed claimed account is not automatically deleted or
recreated. Inspect service-only claim and Auth UUID; resolve with an audited
manual procedure rather than guessing by email or assigning another member's
workspace.
