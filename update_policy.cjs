const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePolicy() {
  const sql = `
    DROP POLICY IF EXISTS "Users can view all profiles" ON public.aspirants;
    DROP POLICY IF EXISTS "Users can view own profile" ON public.aspirants;
    DROP POLICY IF EXISTS "Public read aspirants" ON public.aspirants;
    CREATE POLICY "Public read aspirants" ON public.aspirants FOR SELECT USING (true);
  `;
  
  // Since we can't run raw SQL directly via the JS client easily without a stored procedure,
  // we can just tell the user to run it, or we can see if there's a way to do it.
  // Actually, the user already tried running SQL. I will just provide the SQL to the user.
}
updatePolicy();
