const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: submissions, error: subError } = await supabase
    .from('daily_submissions')
    .select('*')
    .limit(2);
    
  if (submissions && submissions.length > 0) {
    const userIds = [...new Set(submissions.map(r => r.user_id))];
    const { data: profiles, error } = await supabase.from('aspirants').select('user_id, full_name').in('user_id', userIds);
    console.log("Profiles:", profiles);
    console.log("Error:", error);
  } else {
    console.log("No submissions found.");
  }
}
check();
