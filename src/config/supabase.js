import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yffbkskaiwlgcbyhucdr.supabase.co';

const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmJrc2thaXdsZ2NieWh1Y2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTk1MjYsImV4cCI6MjA5NDQzNTUyNn0.Mi5I3of2e1ToPUa2wx5XpST082_rsHikRphRICZsbts';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
