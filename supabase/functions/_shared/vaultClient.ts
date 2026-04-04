import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

interface CachedSecret {
  value: string;
  fetchedAt: number;
}

const cache = new Map<string, CachedSecret>();
const TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getSecret(
  supabaseAdmin: SupabaseClient,
  secretName: string
): Promise<string | null> {
  const cached = cache.get(secretName);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.value;
  }

  const { data, error } = await supabaseAdmin.rpc('get_secret', {
    secret_name: secretName,
  });

  if (error || !data?.[0]?.secret) {
    console.error(`Vault lookup failed for "${secretName}":`, error);
    return null;
  }

  const value = data[0].secret;
  cache.set(secretName, { value, fetchedAt: Date.now() });
  return value;
}
