// Development-only identity diagnostic. This function does not authorize
// planning, read private Supabase tables, or create accounts.
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.2";

const JWKS = createRemoteJWKSet(new URL("https://auth.memberstack.com/jwks"));
const ISSUER = "https://api.memberstack.com";
const AUDIENCE = "app_clbb9rspy00160ujl6tsxbsrj";
const originAllowlist = new Set([
  "https://plan.alveary.org",
  "https://www.alveary.org",
  "https://alveary.org",
  "https://kkeel.github.io",
]);

function headersFor(request: Request): Headers {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  });
  const origin = request.headers.get("origin");
  if (origin && originAllowlist.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "authorization, content-type, apikey, x-client-info");
  }
  return headers;
}

function respond(request: Request, status: number, data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), { status, headers: headersFor(request) });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headersFor(request) });
  if (request.method !== "POST") return respond(request, 405, { error: "method_not_allowed" });
  const bearer = request.headers.get("authorization") ?? "";
  if (!bearer.startsWith("Bearer ") || bearer.length > 8192) {
    return respond(request, 401, { verified: false, error: "missing_or_invalid_token" });
  }
  const token = bearer.slice(7);
  if (!token || token.split(".").length !== 3) {
    return respond(request, 401, { verified: false, error: "missing_or_invalid_token" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["RS256"],
      clockTolerance: "5 seconds",
    });
    // Memberstack's Webflow member JWTs use a signed "id" claim, while
    // some provider token variants use the standard "sub" subject claim.
    // Trust either only AFTER jose verifies RS256, issuer, audience and expiry.
    const subject = typeof payload.sub === "string" ? payload.sub : "";
    const memberIdClaim = typeof payload.id === "string" ? payload.id : "";
    const memberId = subject || memberIdClaim;
    if (payload.type !== "member" ||
        !memberId || memberId.length > 128 ||
        !/^[A-Za-z0-9_-]+$/.test(memberId) ||
        (subject && memberIdClaim && subject !== memberIdClaim)) {
      return respond(request, 401, { verified: false, error: "invalid_identity" });
    }
    // Development diagnostic only. Never expose the member ID or JWT and
    // never treat a verified identity as a school-year entitlement.
    return respond(request, 200, {
      verified: true,
      directSupabaseRoleCompatible: payload.role === "authenticated",
      membershipAuthorized: false,
      diagnosticOnly: true,
    });
  } catch {
    return respond(request, 401, { verified: false, error: "invalid_or_expired_token" });
  }
});
