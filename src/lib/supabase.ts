// Custom Supabase client pointing to the original Timeless AI project
import { createClient } from "@supabase/supabase-js";

// Original Timeless AI Supabase project credentials
const SUPABASE_URL = "https://ifesxveahsbjhmrhkhhy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZXN4dmVhaHNiamhtcmhraGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODc4OTQsImV4cCI6MjA4NDQ2Mzg5NH0.uBRcVNQcTdJNk9gstOCW6xRcQsZ8pnQwy5IGxbhZD6g";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const TIMELESS_SUPABASE_URL = SUPABASE_URL;
export const TIMELESS_ANON_KEY = SUPABASE_ANON_KEY;
