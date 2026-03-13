const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1];
const supabaseKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: cr } = await supabase.from('challenge_resources').select('*');
  console.log('challenge_resources count:', cr ? cr.length : 0);
  if (cr && cr.length > 0) console.log('sample cr:', cr[0]);

  const { data: tat } = await supabase.from('tat_scenarios').select('*');
  console.log('tat_scenarios count:', tat ? tat.length : 0);
  if (tat && tat.length > 0) console.log('sample tat:', tat[0]);
}
check();
