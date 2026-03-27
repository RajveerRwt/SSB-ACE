const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .upsert({ 
        user_id: 'cfd09244-9670-48d9-8da3-c8b02e2bdbd6', 
        coins: 100,
        tier: 'FREE'
    }, { onConflict: 'user_id' })
    .select();
    
  console.log('Upsert result:', data, error);
}

checkSchema();
