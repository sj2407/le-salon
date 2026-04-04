import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ── APNs JWT signing ───────────────────────────────────────────────

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function textToBase64Url(text: string): string {
  return base64UrlEncode(new TextEncoder().encode(text));
}

/** Strip PEM headers and decode base64 to raw bytes */
function pemToBytes(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN .*?-----/g, '')
    .replace(/-----END .*?-----/g, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Create a signed APNs JWT (ES256) valid for 1 hour */
async function createApnsJwt(
  keyPem: string,
  keyId: string,
  teamId: string
): Promise<string> {
  const header = textToBase64Url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const now = Math.floor(Date.now() / 1000);
  const payload = textToBase64Url(JSON.stringify({ iss: teamId, iat: now }));
  const signingInput = `${header}.${payload}`;

  // Import the PKCS8 private key
  const keyData = pemToBytes(keyPem);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign with ES256
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  // Convert DER signature to raw r||s format for JWT
  const sigBytes = new Uint8Array(signature);
  const rawSig = derToRaw(sigBytes);

  return `${signingInput}.${base64UrlEncode(rawSig)}`;
}

/** Convert DER-encoded ECDSA signature to raw r||s (64 bytes) */
function derToRaw(der: Uint8Array): Uint8Array {
  // Web Crypto may return raw format directly (64 bytes for P-256)
  if (der.length === 64) return der;

  // DER format: 0x30 <len> 0x02 <rlen> <r> 0x02 <slen> <s>
  let offset = 2; // skip 0x30 + total length
  if (der[1] > 127) offset += (der[1] - 128); // long form length

  // Parse r
  offset++; // skip 0x02
  const rLen = der[offset++];
  const rStart = offset;
  offset += rLen;

  // Parse s
  offset++; // skip 0x02
  const sLen = der[offset++];
  const sStart = offset;

  const raw = new Uint8Array(64);
  // Copy r (right-aligned to 32 bytes, skip leading zero if present)
  const rBytes = der.slice(rStart, rStart + rLen);
  const rPad = 32 - rLen;
  if (rPad >= 0) {
    raw.set(rBytes, rPad);
  } else {
    // r has leading zero byte (33 bytes), skip it
    raw.set(rBytes.slice(-32), 0);
  }
  // Copy s
  const sBytes = der.slice(sStart, sStart + sLen);
  const sPad = 32 - sLen;
  if (sPad >= 0) {
    raw.set(sBytes, 32 + sPad);
  } else {
    raw.set(sBytes.slice(-32), 32);
  }

  return raw;
}

// ── Cache the JWT (APNs tokens are valid for 1 hour) ───────────────

let cachedJwt: { token: string; issuedAt: number } | null = null;
const JWT_TTL_MS = 50 * 60 * 1000; // Refresh every 50 min (valid for 60)

async function getApnsJwt(): Promise<string> {
  if (cachedJwt && (Date.now() - cachedJwt.issuedAt) < JWT_TTL_MS) {
    return cachedJwt.token;
  }
  const key = Deno.env.get('APNS_KEY');
  const keyId = Deno.env.get('APNS_KEY_ID');
  const teamId = Deno.env.get('APNS_TEAM_ID');
  if (!key || !keyId || !teamId) {
    throw new Error('Missing APNs env vars (APNS_KEY, APNS_KEY_ID, or APNS_TEAM_ID)');
  }
  const token = await createApnsJwt(key, keyId, teamId);
  cachedJwt = { token, issuedAt: Date.now() };
  return token;
}

// ── Send push notification via APNs ────────────────────────────────

async function sendApnsPush(
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<{ success: boolean; status: number; reason?: string }> {
  const jwt = await getApnsJwt();
  const bundleId = Deno.env.get('APNS_BUNDLE_ID') || 'app.lesalon';

  // Defaults to sandbox for TestFlight. Set APNS_HOST env var to
  // https://api.push.apple.com for App Store production release.
  const host = Deno.env.get('APNS_HOST') || 'https://api.sandbox.push.apple.com';
  const url = `${host}/3/device/${deviceToken}`;

  const payload = {
    aps: {
      alert: { title, body },
      sound: 'default',
    },
    // Custom data for deep linking on tap
    ...data,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 200) {
    return { success: true, status: 200 };
  }

  const errorBody = await response.text();
  console.error(`APNs error for token ${deviceToken.slice(0, 8)}...: ${response.status} ${errorBody}`);
  return { success: false, status: response.status, reason: errorBody };
}

// ── Main handler ───────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Only accept POST from service role (called by DB trigger via pg_net)
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify caller via shared PUSH_SECRET (used by DB trigger via pg_net)
  const pushSecret = Deno.env.get('PUSH_SECRET');
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!pushSecret || token !== pushSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  let user_id: string, title: string, body: string, data: Record<string, unknown>;
  try {
    ({ user_id, title, body, data } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!user_id || !title || !body) {
    return new Response(JSON.stringify({ error: 'Missing user_id, title, or body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Look up device tokens for this user
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: tokens, error } = await supabaseAdmin
    .from('device_tokens')
    .select('token')
    .eq('user_id', user_id);

  if (error) {
    console.error('Failed to fetch device tokens:', error);
    return new Response(JSON.stringify({ error: 'DB error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!tokens || tokens.length === 0) {
    // User has no registered devices — not an error
    return new Response(JSON.stringify({ sent: 0, reason: 'no_tokens' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Send to all registered devices
  const results = await Promise.allSettled(
    tokens.map((t: { token: string }) => sendApnsPush(t.token, title, body, data || {}))
  );

  // Clean up invalid tokens (APNs returns 410 for unregistered devices)
  const invalidTokens: string[] = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.status === 410) {
      invalidTokens.push(tokens[i].token);
    }
  });

  if (invalidTokens.length > 0) {
    await supabaseAdmin
      .from('device_tokens')
      .delete()
      .in('token', invalidTokens);
    console.log(`Cleaned up ${invalidTokens.length} invalid token(s)`);
  }

  const sent = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success
  ).length;

  return new Response(JSON.stringify({ sent, total: tokens.length }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});
