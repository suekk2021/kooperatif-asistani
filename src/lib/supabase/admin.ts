import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SADECE sunucu tarafinda, oturumsuz (cron/webhook) islemler icin kullanilir.
// service_role anahtari RLS'i atlar - istemciye asla import edilmemeli.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
