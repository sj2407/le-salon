import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { FIXTURES } from './fixtures/index.ts';

const MOCK_MODE = Deno.env.get('MOCK_APIS') === 'true';

interface ApiCallOptions {
  service: string;
  endpoint: string;
  fixtureKey: string;
  fetchFn: () => Promise<Response>;
}

export async function apiCall<T>(opts: ApiCallOptions): Promise<T> {
  if (MOCK_MODE) {
    if (FIXTURES[opts.fixtureKey]) {
      console.log(`[MOCK] ${opts.service}/${opts.endpoint} → fixture: ${opts.fixtureKey}`);
      return FIXTURES[opts.fixtureKey] as T;
    }
    throw new Error(`No fixture for "${opts.fixtureKey}". Add it to _shared/fixtures/index.ts`);
  }

  console.warn(`[REAL API CALL] ${opts.service}/${opts.endpoint} — fixture: ${opts.fixtureKey}`);
  const res = await opts.fetchFn();

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${opts.service} API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  console.log(`[REAL] Response received for "${opts.fixtureKey}" — copy into fixtures/index.ts if needed`);
  return data as T;
}
