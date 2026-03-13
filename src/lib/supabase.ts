import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Custom fetch with automatic retry for connection failures
// Fixes: ERR_CONNECTION_RESET, ERR_HTTP2_PROTOCOL_ERROR, ERR_CONNECTION_CLOSED
const resilientFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err: any) {
      const isRetryable = err?.message?.includes('Failed to fetch') ||
                          err?.message?.includes('NetworkError') ||
                          err?.message?.includes('ERR_CONNECTION');
      if (isRetryable && attempt < MAX_RETRIES) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
  // Unreachable but TypeScript needs it
  return fetch(input, init);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: resilientFetch
  }
})
