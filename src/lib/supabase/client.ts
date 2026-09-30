import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types";
import { requireSupabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const { url, key } = requireSupabaseEnv();
  return createBrowserClient<Database>(url, key);
}
