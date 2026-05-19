import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Mangler SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY i Vercel Environment Variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function getLatestMetric(metricKey) {
  const supabase = getSupabaseAdmin();

  const { data: latestGood, error: goodError } = await supabase
    .from("market_metrics")
    .select("*")
    .eq("metric_key", metricKey)
    .eq("status", "ok")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (goodError) throw goodError;

  const { data: latestRun, error: runError } = await supabase
    .from("market_metrics")
    .select("*")
    .eq("metric_key", metricKey)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runError) throw runError;

  return { latestGood, latestRun };
}

export async function insertMetric(row) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("market_metrics")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
