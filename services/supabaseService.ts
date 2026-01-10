
import { createClient } from '@supabase/supabase-js';
import { PIQData } from '../types';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://nidbiyrliunqhakkqdvn.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJpeXJsaXVucWhha2txZHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjczMTUsImV4cCI6MjA4Mjk0MzMxNX0.FfSHE1ZAokWxbfG6qyCXdnOJpReW5PMyZg4wrN7sjXY';

export const ADMIN_EMAILS = ['rajveerrawat947@gmail.com'];

export const isUserAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
};

let supabase: any = null;
let isSupabaseActive = false;

try {
  if (SUPABASE_URL && SUPABASE_URL.startsWith('https://')) {
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      isSupabaseActive = true;
  }
} catch (error) {
  console.error("Supabase init failed", error);
}

export async function checkAuthSession() {
  if (!isSupabaseActive || !supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  } catch (e) {
    return null;
  }
}

export function subscribeToAuthChanges(callback: (user: any) => void) {
  if (!isSupabaseActive || !supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      callback(session?.user || null);
    } else if (event === 'SIGNED_OUT') {
      callback(null);
    }
  });
  return () => {
    subscription.unsubscribe();
  };
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  if (!isSupabaseActive || !supabase) return { data: null, error: { message: "Supabase inactive" } };
  return await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
}

export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseActive || !supabase) return { data: null, error: { message: "Supabase inactive" } };
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function syncUserProfile(user: any) {
  if (!isSupabaseActive || !supabase || user.isMock) return;
  try {
    await supabase.from('aspirants').upsert({
      user_id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      avatar_url: user.user_metadata?.avatar_url || '',
      last_active: new Date().toISOString()
    }, { onConflict: 'user_id' });
  } catch (error) {}
}

export async function saveUserData(userId: string, data: Partial<PIQData>) {
  if (isSupabaseActive && supabase && !userId.startsWith('demo')) {
    const { error } = await supabase.from('aspirants').upsert({ 
      user_id: userId, 
      piq_data: data, 
      last_active: new Date().toISOString() 
    }, { onConflict: 'user_id' });
    return !error;
  }
  return false;
}

export async function saveTestAttempt(userId: string, testType: string, resultData: any) {
  if (isSupabaseActive && supabase && !userId.startsWith('demo')) {
    const { error } = await supabase.from('test_history').insert({
      user_id: userId,
      test_type: testType,
      score: resultData.score || 0,
      result_data: resultData,
      created_at: new Date().toISOString()
    });
    return !error;
  }
  return false;
}

export async function getUserData(userId: string): Promise<PIQData | null> {
  if (isSupabaseActive && supabase && !userId.startsWith('demo')) {
    const { data } = await supabase.from('aspirants').select('piq_data').eq('user_id', userId).single();
    if (data) return data.piq_data as PIQData;
  }
  return null;
}

export async function getUserHistory(userId: string) {
  if (isSupabaseActive && supabase && !userId.startsWith('demo')) {
    const { data } = await supabase.from('test_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5);
    return data?.map((item: any) => ({
      id: item.id,
      type: item.test_type,
      timestamp: item.created_at,
      score: item.score,
      result: item.result_data
    })) || [];
  }
  return [];
}

export async function uploadPPDTScenario(file: File, description: string) {
  if (!isSupabaseActive || !supabase) throw new Error("Supabase connection is not active.");
  
  const fileExt = file.name.split('.').pop();
  const fileName = `ppdt_${Math.random().toString(36).substring(7)}.${fileExt}`;
  
  console.log(`Starting PPDT upload to bucket 'ppdt-images'...`);
  const { error: uploadError } = await supabase.storage.from('ppdt-images').upload(fileName, file);
  
  if (uploadError) {
    console.error("Supabase Storage Error:", uploadError);
    throw new Error(`Storage Upload Error (403): ${uploadError.message}. Make sure the bucket 'ppdt-images' exists and has RLS policies configured.`);
  }
  
  const { data: { publicUrl } } = supabase.storage.from('ppdt-images').getPublicUrl(fileName);
  
  const { error: dbError, data } = await supabase.from('ppdt_scenarios').insert([{ 
    image_url: publicUrl, 
    description 
  }]).select();
  
  if (dbError) throw new Error(`Database Insert Error: ${dbError.message}. Ensure RLS policies allow inserts on table 'ppdt_scenarios'.`);
  return data;
}

export async function getPPDTScenarios() {
  if (!isSupabaseActive || !supabase) return [];
  const { data } = await supabase.from('ppdt_scenarios').select('*').order('created_at', { ascending: false });
  return data || [];
}

export async function deletePPDTScenario(id: string, imageUrl: string) {
  if (!isSupabaseActive || !supabase) return;
  await supabase.from('ppdt_scenarios').delete().eq('id', id);
  const path = imageUrl.split('/').pop();
  if (path) await supabase.storage.from('ppdt-images').remove([path]);
}

export async function uploadTATScenario(file: File, description: string, setTag: string = 'Default') {
  if (!isSupabaseActive || !supabase) throw new Error("Supabase connection is not active.");
  
  const fileExt = file.name.split('.').pop();
  const fileName = `tat_${Math.random().toString(36).substring(7)}.${fileExt}`;
  
  console.log(`Starting TAT upload to bucket 'tat-images'...`);
  const { error: uploadError } = await supabase.storage.from('tat-images').upload(fileName, file);
  
  if (uploadError) {
    console.error("Supabase Storage Error:", uploadError);
    throw new Error(`Storage Upload Error (403): ${uploadError.message}. Make sure the bucket 'tat-images' exists and has RLS policies configured.`);
  }
  
  const { data: { publicUrl } } = supabase.storage.from('tat-images').getPublicUrl(fileName);
  
  const { error: dbError, data } = await supabase.from('tat_scenarios').insert([{ 
    image_url: publicUrl, 
    description, 
    set_tag: setTag 
  }]).select();
  
  if (dbError) throw new Error(`Database Insert Error: ${dbError.message}. Ensure RLS policies allow inserts on table 'tat_scenarios'.`);
  return data;
}

export async function getTATScenarios() {
  if (!isSupabaseActive || !supabase) return [];
  const { data } = await supabase.from('tat_scenarios').select('*').order('created_at', { ascending: false });
  return data || [];
}

export async function deleteTATScenario(id: string, imageUrl: string) {
  if (!isSupabaseActive || !supabase) return;
  await supabase.from('tat_scenarios').delete().eq('id', id);
  const path = imageUrl.split('/').pop();
  if (path) await supabase.storage.from('tat-images').remove([path]);
}
