// DEVELOPMENT-ONLY Memberstack website -> Supabase Auth session proof.
// Optional first-time tester provisioning is disabled unless explicitly gated.
// Never use the browser-provided Memberstack JWT as a Supabase JWT.
// Issue: authenticated Webflow website -> 60s single-use PKCE-bound code.
// Redeem: plan.alveary.org -> atomically consume code and create a real
// Supabase Auth session using Admin generateLink + verifyOtp on an isolated
// test account. No email is sent and no secret/refresh token crosses a URL.
// This does NOT grant Demo member access; private API gates remain unchanged.
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.2";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const APP_ID = "app_clbb9rspy00160ujl6tsxbsrj";
const JWKS = createRemoteJWKSet(
  new URL("https://auth.memberstack.com/.well-known/member-jwks.json")
);
const ISSUE_ORIGINS = new Set([
  "https://alveary.org",
  "https://www.alveary.org",
  // Same first-party browser origin may receive the root-domain Memberstack
  // cookie and should not need a return trip through Webflow.
  "https://plan.alveary.org",
  "http://localhost:3000",
]);
const REDEEM_ORIGINS = new Set([
  "https://plan.alveary.org",
  "http://localhost:3000",
]);
const ALL_ORIGINS = new Set([...ISSUE_ORIGINS, ...REDEEM_ORIGINS]);
const HEX_ID = /^[0-9a-f]{24}$/;
const B64URL43 = /^[A-Za-z0-9_-]{43}$/;

type Body = { action?: unknown; state?: unknown; challenge?: unknown;
  code?: unknown; verifier?: unknown };

function response(req: Request, status: number, value: object): Response {
  const origin = req.headers.get("Origin");
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  if (origin && ALL_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "authorization,apikey,content-type,x-client-info");
  }
  // 204 preflight responses must not include a response body.
  return new Response(status === 204 ? null : JSON.stringify(value), { status, headers });
}
function serviceKey(): string | undefined {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    const values = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    return typeof values.default === "string" ? values.default : undefined;
  } catch { return undefined; }
}
function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64url(bytes);
}
function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function hashHex(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(value)
  ));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
async function pkceChallenge(verifier: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(verifier)
  ));
  return base64url(bytes);
}
async function parseBody(req: Request): Promise<Body | null> {
  if (!req.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) return null;
  const raw = await req.text();
  if (raw.length > 2048) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Body : null;
  } catch { return null; }
}
async function verifiedMemberId(req: Request): Promise<string | null> {
  const bearer = req.headers.get("Authorization") ?? "";
  if (!bearer.startsWith("Bearer ") || bearer.length > 8192) return null;
  const token = bearer.slice(7);
  if (token.split(".").length !== 3) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: "https://api.memberstack.com",
      audience: APP_ID,
      algorithms: ["RS256"],
      clockTolerance: "5 seconds",
    });
    const id = typeof payload.id === "string" ? payload.id : "";
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const memberId = id || sub;
    if (payload.type !== "member" || !HEX_ID.test(memberId) ||
        typeof payload.exp !== "number" || (id && sub && id !== sub)) return null;
    return memberId;
  } catch { return null; }
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = serviceKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Exact live 2027-28 Testing Plan grant only, never browser claims.
// Called before issue AND again just before redeem completes.
async function hasActiveDemo(memberId: string,
  admin: NonNullable<ReturnType<typeof adminClient>>): Promise<boolean> {
  const apiKey = Deno.env.get("MEMBERSTACK_LIVE_SECRET_KEY");
  if (!apiKey) throw Error("missing_memberstack_secret");
  const { data: rules, error } = await admin.from("memberstack_plan_access_rules")
    .select("memberstack_plan_id")
    .eq("enabled", true).eq("plan_kind", "demo").eq("school_year", "2027-28")
    .eq("workspace_type", "family").eq("capability", "planning");
  if (error || !rules?.length) throw Error("rules_unavailable");
  const allowed = new Set(rules.map(x => x.memberstack_plan_id));
  async function fetchMember(candidate: string): Promise<"missing" | {
    id?: unknown; planConnections?: unknown;
  }> {
    const result = await fetch("https://admin.memberstack.com/members/" +
      encodeURIComponent(candidate), {
        headers: { "X-API-KEY": apiKey, "Accept": "application/json" },
        cache: "no-store", redirect: "error",
        signal: AbortSignal.timeout(9000),
      });
    if (result.status === 404) return "missing";
    if (!result.ok) throw Error("memberstack_unavailable");
    const json: unknown = await result.json();
    if (!json || typeof json !== "object" || !("data" in json)) throw Error("member_response");
    const profile = (json as { data?: unknown }).data;
    if (profile === null || profile === undefined) return "missing";
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) throw Error("member_response");
    return profile as { id?: unknown; planConnections?: unknown };
  }
  let profile = await fetchMember(memberId);
  if (profile === "missing") profile = await fetchMember("mem_" + memberId);
  if (profile === "missing") return false;
  if (profile.id !== memberId && profile.id !== "mem_" + memberId) throw Error("member_mismatch");
  if (!Array.isArray(profile.planConnections)) throw Error("plans_missing");
  return profile.planConnections.some((v: unknown) => {
    if (!v || typeof v !== "object") return false;
    const plan = v as { planId?: unknown; status?: unknown };
    return plan.status === "ACTIVE" && typeof plan.planId === "string" &&
      allowed.has(plan.planId);
  });
}

// Development-only identity mapping. Memberstack member ID (never email)
// chooses the account. Legacy pilot accounts remain valid during transition.
// First-time provisioning is off by default until test-only acceptance checks.
function testerProvisioningEnabled(): boolean {
  return Deno.env.get("MEMBERSTACK_TEST_AUTO_PROVISION_ENABLED") === "true";
}
async function getTestAccount(memberId: string,
  admin: NonNullable<ReturnType<typeof adminClient>>): Promise<{
    auth_user_id: string; login_email: string;
  } | null> {
  const { data: existing, error: lookupError } = await admin
    .from("memberstack_handoff_test_accounts")
    .select("auth_user_id,login_email")
    .eq("member_id", memberId).maybeSingle();
  if (lookupError) throw Error("account_lookup_failed");
  return existing ?? null;
}

// An eligible tester with no existing mapping can be provisioned ONCE.
// A persistent unique member-ID claim prevents concurrent account creation.
// If creating a user succeeds but a later DB write fails, the claim remains:
// fail closed and require audited operator repair, never guess or remap by email.
// The opaque internal address is a non-deliverable Supabase Auth transport
// requirement, NOT a user identity/ownership proof or member login method.
// This is still a pilot-only session adapter pending production Auth review.
async function getOrProvisionTestAccount(memberId: string,
  admin: NonNullable<ReturnType<typeof adminClient>>): Promise<{
    auth_user_id: string; login_email: string;
  } | null> {
  const existing = await getTestAccount(memberId, admin);
  if (existing) return existing;
  if (!testerProvisioningEnabled()) return null;

  const claim = randomCode();
  const claimHash = await hashHex(claim);
  const { error: claimError } = await admin
    .from("memberstack_tester_provisioning_claims")
    .insert({ member_id: memberId, claim_sha256: claimHash });
  if (claimError) {
    if (claimError.code === "23505") {
      // A concurrent caller may have finished, otherwise retry the website
      // entry later. Do not create another Supabase Auth identity.
      return await getTestAccount(memberId, admin);
    }
    throw Error("tester_claim_unavailable");
  }

  // Random, non-deliverable technical email; NEVER the Memberstack email.
  // No email is sent and the member neither sees nor verifies this address.
  const loginEmail = "planner-" + randomCode().toLowerCase() +
    "@auth.alveary.invalid";
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: loginEmail,
    email_confirm: true,
    app_metadata: {
      memberstack_app_id: APP_ID,
      planner_provisioning: "signed_memberstack_tester_pilot",
    },
  });
  if (createError || !created.user || created.user.email !== loginEmail ||
      created.user.app_metadata?.memberstack_app_id !== APP_ID ||
      created.user.app_metadata?.provider !== "email") {
    throw Error("tester_auth_creation_failed");
  }
  const { data: claimSaved, error: updateError } = await admin
    .from("memberstack_tester_provisioning_claims")
    .update({
      auth_user_id: created.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("member_id", memberId)
    .eq("claim_sha256", claimHash)
    .is("auth_user_id", null)
    .select("member_id")
    .maybeSingle();
  if (updateError || !claimSaved) throw Error("tester_claim_finalize_failed");

  const { error: mapError } = await admin
    .from("memberstack_handoff_test_accounts")
    .insert({
      member_id: memberId,
      auth_user_id: created.user.id,
      login_email: loginEmail,
    });
  if (mapError) throw Error("tester_account_mapping_failed");
  return { auth_user_id: created.user.id, login_email: loginEmail };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return response(req, 204, {});
  if (req.method !== "POST") return response(req, 405, { error: "method_not_allowed" });
  const origin = req.headers.get("Origin");
  if (!origin || !ALL_ORIGINS.has(origin)) return response(req, 403, { error: "origin_not_allowed" });
  const body = await parseBody(req);
  if (!body) return response(req, 400, { error: "invalid_request" });
  const admin = adminClient();
  if (!admin) return response(req, 503, { error: "server_not_configured" });
  try {
    if (body.action === "issue") {
      if (!ISSUE_ORIGINS.has(origin)) return response(req, 403, { error: "origin_not_allowed" });
      if (typeof body.state !== "string" || !B64URL43.test(body.state) ||
          typeof body.challenge !== "string" || !B64URL43.test(body.challenge)) {
        return response(req, 400, { error: "invalid_challenge" });
      }
      const memberId = await verifiedMemberId(req);
      if (!memberId) return response(req, 401, { error: "invalid_member_token" });
      if (!await hasActiveDemo(memberId, admin)) {
        return response(req, 403, { error: "demo_plan_required" });
      }
      // Until account recovery is reviewed, allow only the server-verified
      // identity that completed the controlled desktop test.
      const pilotAccount = await getTestAccount(memberId, admin);
      // Non-provisioned members are admitted only when the explicit tester
      // feature gate is enabled. Actual account creation happens at redeem,
      // after PKCE proof consumption and a SECOND live membership check.
      if (!pilotAccount && !testerProvisioningEnabled()) {
        return response(req, 403, { error: "handoff_pilot_not_enabled" });
      }
      const recent = new Date(Date.now() - 300000).toISOString();
      const { count, error: countError } = await admin
        .from("memberstack_handoff_codes")
        .select("code_sha256", { count: "exact", head: true })
        .eq("member_id", memberId).gte("created_at", recent);
      if (countError) throw Error("rate_check_failed");
      if ((count ?? 0) >= 5) return response(req, 429, { error: "try_later" });
      const code = randomCode();
      const { error: insertError } = await admin.from("memberstack_handoff_codes")
        .insert({
          code_sha256: await hashHex(code),
          state_sha256: await hashHex(body.state),
          pkce_challenge: body.challenge,
          member_id: memberId,
          expires_at: new Date(Date.now() + 60000).toISOString(),
        });
      if (insertError) throw Error("issue_failed");
      // Code can appear in a URL fragment, never member JWT or session secrets.
      return response(req, 200, { code, state: body.state, expiresIn: 60 });
    }
    if (body.action === "redeem") {
      if (!REDEEM_ORIGINS.has(origin)) return response(req, 403, { error: "origin_not_allowed" });
      if (typeof body.state !== "string" || !B64URL43.test(body.state) ||
          typeof body.code !== "string" || !B64URL43.test(body.code) ||
          typeof body.verifier !== "string" || !B64URL43.test(body.verifier)) {
        return response(req, 400, { error: "invalid_redemption" });
      }
      const { data: memberId, error: consumeError } = await admin.rpc(
        "memberstack_consume_handoff", {
          p_code_sha256: await hashHex(body.code),
          p_state_sha256: await hashHex(body.state),
          p_pkce_challenge: await pkceChallenge(body.verifier),
        }
      );
      if (consumeError) throw Error("consume_failed");
      if (typeof memberId !== "string" || !HEX_ID.test(memberId)) {
        return response(req, 401, { error: "expired_or_used_handoff" });
      }
      if (!await hasActiveDemo(memberId, admin)) {
        return response(req, 403, { error: "demo_plan_required" });
      }
      const account = await getOrProvisionTestAccount(memberId, admin);
      if (!account) return response(req, 403, { error: "handoff_pilot_not_enabled" });
      // Admin generates an OTP without sending mail; the OTP itself never
      // travels through browser URLs. Verify on the trusted backend.
      const { data: link, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink", email: account.login_email,
      });
      const hash = link?.properties?.hashed_token;
      if (linkError || typeof hash !== "string" || !hash) throw Error("link_failed");
      const url = Deno.env.get("SUPABASE_URL");
      if (!url) throw Error("server_not_configured");
      const authClient = createClient(url, serviceKey()!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: result, error: verifyError } = await authClient.auth.verifyOtp({
        type: "magiclink", token_hash: hash,
      });
      if (verifyError || !result.session || result.user?.id !== account.auth_user_id) {
        throw Error("supabase_auth_exchange_failed");
      }
      return response(req, 200, {
        // Only direct response to the original plan origin, over TLS.
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
        expires_in: result.session.expires_in,
        verified: true,
        privateDataAuthorized: false,
      });
    }
    return response(req, 400, { error: "unknown_action" });
  } catch {
    // No tokens, member IDs, emails or secrets in errors/logs.
    return response(req, 503, { error: "handoff_unavailable" });
  }
});
