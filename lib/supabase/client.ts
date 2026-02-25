'use client';

import { createBrowserClient } from '@supabase/ssr';

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || url === 'https://your-project.supabase.co') {
    console.error(
      '❌ NEXT_PUBLIC_SUPABASE_URL is missing or still the placeholder.\n' +
      '   → Open .env.local and set it to your Supabase project URL.\n' +
      '   → Get it from: https://supabase.com/dashboard → Settings → API'
    );
  }
  if (!key || key === 'your-anon-key-here') {
    console.error(
      '❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or still the placeholder.\n' +
      '   → Open .env.local and set it to your Supabase anon/public key.\n' +
      '   → Get it from: https://supabase.com/dashboard → Settings → API'
    );
  }

  return { url: url || '', key: key || '' };
}

export function createClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient(url, key);
}
