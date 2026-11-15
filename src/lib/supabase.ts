import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// المفتاح "publishable" مصمَّم ليُضمَّن في التطبيق؛ الحماية الفعلية عبر سياسات RLS في القاعدة.
export const SUPABASE_URL = "https://gashsgqkqtihpspvpxvb.supabase.co";
export const SUPABASE_KEY = "sb_publishable_dOdr5hPVpp92G2jRzBGNyA_JTMUQco7";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
