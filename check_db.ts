import { supabase } from './services/supabaseService.ts';
async function run() {
  const { data, error } = await supabase.from('daily_challenges').select('*').limit(1);
  console.log(data, error);
}
run();
