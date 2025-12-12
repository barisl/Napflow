import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://avxokrbesshpetqfudct.supabase.co';
const supabaseAnonKey = 'sb_publishable_H88w4xq_tSSZkN9nBcSQhA_ywciteDB';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

