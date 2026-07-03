import { createBrowserClient } from "@supabase/ssr";

// Client Component icinde (form etkilesimleri, gercek zamanli guncellemeler) kullanilir.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
