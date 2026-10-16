import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://srnchbyoqntfjxfogoqr.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_x8Itwo0NJ-MUMpa7P5hD4g_WQnlaA89";

export const supabase = createClient(supabaseUrl, supabaseKey);
