import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Spotify Auth — OAuth 2.0 with PKCE
 *
 * Actions:
 *   callback  — Exchange authorization code for tokens. Client generates
 *               PKCE verifier/challenge and handles the redirect; this function
 *               performs the server-side token exchange and stores tokens securely.
 *   disconnect — Soft-delete: sets is_active=false, removes tokens.
 *
 * Secrets required in Supabase Vault:
 *   spotify_client_id
 *   spotify_client_secret
 */

let cachedClientId: string | null = null;
let cachedClientSecret: string | null = null;

async function getSpotifyCredentials(supabaseAdmin: ReturnType<typeof createClient>) {
  if (cachedClientId && cachedClientSecret) {
    return { clientId: cachedClientId, clientSecret: cachedClientSecret };
  }

  const { data: idSecrets } = await supabaseAdmin.rpc('get_secret', {
    secret_name: 'spotify_client_id',
  });
  const { data: secretSecrets } = await supabaseAdmin.rpc('get_secret', {
    secret_name: 'spotify_client_secret',
  });

  cachedClientId = idSecrets?.[0]?.secret || null;
  cachedClientSecret = secretSecrets?.[0]?.secret || null;

  return { clientId: cachedClientId, clientSecret: cachedClientSecret };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Also create a user-scoped client for RLS operations
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Could not verify user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, code, code_verifier, redirect_uri } = await req.json();

    // ── CALLBACK: Exchange code for tokens ──────────────────────────────
    if (action === 'callback') {
      if (!code || !code_verifier || !redirect_uri) {
        return new Response(
          JSON.stringify({ error: 'code, code_verifier, and redirect_uri are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { clientId, clientSecret } = await getSpotifyCredentials(supabaseAdmin);
      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({ error: 'Spotify credentials not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Exchange authorization code for tokens
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri,
          client_id: clientId,
          client_secret: clientSecret,
          code_verifier,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error('Spotify token exchange error:', tokenRes.status, errText);
        return new Response(
          JSON.stringify({ error: 'Spotify token exchange failed' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens = await tokenRes.json();
      const { access_token, refresh_token } = tokens;

      if (!access_token || !refresh_token) {
        return new Response(
          JSON.stringify({ error: 'Invalid token response from Spotify' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Store tokens (service_role bypasses RLS on spotify_tokens)
      const { error: tokenError } = await supabaseAdmin
        .from('spotify_tokens')
        .upsert({
          user_id: user.id,
          access_token,
          refresh_token,
          updated_at: new Date().toISOString(),
        });

      if (tokenError) {
        console.error('Token storage error:', tokenError);
        return new Response(
          JSON.stringify({ error: 'Failed to store tokens' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create/reactivate spotify_profiles row
      const { error: profileError } = await supabaseAdmin
        .from('spotify_profiles')
        .upsert({
          user_id: user.id,
          is_active: true,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── DISCONNECT: Soft-delete ─────────────────────────────────────────
    if (action === 'disconnect') {
      // Set profile inactive
      const { error: profileError } = await supabaseAdmin
        .from('spotify_profiles')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Disconnect profile error:', profileError);
      }

      // Remove tokens
      const { error: tokenError } = await supabaseAdmin
        .from('spotify_tokens')
        .delete()
        .eq('user_id', user.id);

      if (tokenError) {
        console.error('Disconnect token error:', tokenError);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "callback" or "disconnect".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('spotify-auth error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
