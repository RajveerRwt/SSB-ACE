import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Testing test_history...");
  const { data, error } = await supabase
    .from('test_history')
    .select('*')
    .limit(1);
  console.log("Select * error:", error);

  const { data: d2, error: e2 } = await supabase
    .from('test_history')
    .select('*')
    .eq('result_data->>_status', 'pending');
  console.log("JSON query error:", e2);
}

test();
