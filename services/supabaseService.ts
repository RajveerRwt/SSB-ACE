
import { createClient } from '@supabase/supabase-js';
import { PIQData, UserSubscription } from '../types';

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

// --- SUBSCRIPTION & LIMIT LOGIC ---

const DEFAULT_FREE_LIMITS = {
  interview: 1,
  ppdt: 5,
  tat: 2,
};

const PRO_LIMITS = {
  interview: 5,
  ppdt: 20,
  tat: 7,
};

// Mock local storage for subscription data if DB fails or for demo
const getLocalSubscription = (userId: string): UserSubscription => {
  const stored = localStorage.getItem(`ssb_sub_${userId}`);
  if (stored) return JSON.parse(stored);
  
  return {
    tier: 'FREE',
    expiryDate: null,
    usage: {
      interview_used: 0,
      interview_limit: DEFAULT_FREE_LIMITS.interview,
      ppdt_used: 0,
      ppdt_limit: DEFAULT_FREE_LIMITS.ppdt,
      tat_used: 0,
      tat_limit: DEFAULT_FREE_LIMITS.tat,
      wat_used: 0,
      srt_used: 0
    },
    extra_credits: { interview: 0 }
  };
};

export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  if (userId.startsWith('demo')) return getLocalSubscription(userId);

  if (isSupabaseActive && supabase) {
     try {
       // Attempt to fetch from 'profiles' or 'subscriptions' table
       // Assuming simple schema: tier, usage_data jsonb in 'aspirants' table for now
       const { data, error } = await supabase.from('aspirants').select('subscription_data').eq('user_id', userId).single();
       
       if (data && data.subscription_data) {
         return data.subscription_data as UserSubscription;
       }
     } catch (e) {
       console.warn("Using local subscription fallback");
     }
  }
  return getLocalSubscription(userId);
}

export async function updateUserSubscription(userId: string, subData: UserSubscription) {
  localStorage.setItem(`ssb_sub_${userId}`, JSON.stringify(subData));
  
  if (isSupabaseActive && supabase && !userId.startsWith('demo')) {
    await supabase.from('aspirants').upsert({
      user_id: userId,
      subscription_data: subData,
      last_active: new Date().toISOString()
    }, { onConflict: 'user_id' });
  }
}

export async function checkLimit(userId: string, testType: string): Promise<{ allowed: boolean; message?: string }> {
  const sub = await getUserSubscription(userId);
  const { usage, extra_credits, tier } = sub;

  if (testType === 'WAT' || testType === 'SRT') return { allowed: true }; // Unlimited

  if (testType === 'INTERVIEW') {
    const totalLimit = usage.interview_limit + extra_credits.interview;
    if (usage.interview_used >= totalLimit) {
      return { allowed: false, message: `Interview Limit Reached (${usage.interview_used}/${totalLimit}). Upgrade to Pro or buy Add-ons.` };
    }
  }
  
  if (testType === 'PPDT') {
    if (usage.ppdt_used >= usage.ppdt_limit) return { allowed: false, message: `PPDT Daily Limit Reached (${usage.ppdt_used}/${usage.ppdt_limit}). Upgrade for more.` };
  }

  if (testType === 'TAT') {
    if (usage.tat_used >= usage.tat_limit) return { allowed: false, message: `TAT Limit Reached (${usage.tat_used}/${usage.tat_limit}). Upgrade for more.` };
  }

  return { allowed: true };
}

export async function incrementUsage(userId: string, testType: string) {
  const sub = await getUserSubscription(userId);
  
  if (testType === 'INTERVIEW') sub.usage.interview_used += 1;
  else if (testType === 'PPDT') sub.usage.ppdt_used += 1;
  else if (testType === 'TAT') sub.usage.tat_used += 1;
  else if (testType === 'WAT') sub.usage.wat_used += 1;
  else if (testType === 'SRT') sub.usage.srt_used += 1;

  await updateUserSubscription(userId, sub);
}

export async function processPaymentSuccess(userId: string, planType: 'PRO_SUBSCRIPTION' | 'INTERVIEW_ADDON') {
  const sub = await getUserSubscription(userId);

  if (planType === 'PRO_SUBSCRIPTION') {
    sub.tier = 'PRO';
    // Set expiry to 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    sub.expiryDate = d.toISOString();
    
    // Reset limits to Pro
    sub.usage.interview_limit = PRO_LIMITS.interview;
    sub.usage.ppdt_limit = PRO_LIMITS.ppdt;
    sub.usage.tat_limit = PRO_LIMITS.tat;
  } else if (planType === 'INTERVIEW_ADDON') {
    // Add 1 extra interview credit
    sub.extra_credits.interview += 1;
  }

  await updateUserSubscription(userId, sub);
  return sub;
}


// --- EXISTING AUTH & DATA FUNCTIONS ---

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
  // Increment usage first
  await incrementUsage(userId, testType);

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

// --- PPDT & TAT Image Management ---

export async function uploadPPDTScenario(file: File, description: string) {
  if (!isSupabaseActive || !supabase) throw new Error("Supabase connection is not active.");
  
  const fileExt = file.name.split('.').pop();
  const fileName = `ppdt_${Math.random().toString(36).substring(7)}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage.from('ppdt-images').upload(fileName, file);
  
  if (uploadError) {
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
  
  const { error: uploadError } = await supabase.storage.from('tat-images').upload(fileName, file);
  
  if (uploadError) {
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

// --- WAT WORD MANAGEMENT ---

export async function uploadWATWords(words: string[]) {
  if (!isSupabaseActive || !supabase) throw new Error("Supabase connection is not active.");
  
  // Create rows for insertion
  const rows = words.map(word => ({ word: word.trim() })).filter(r => r.word.length > 0);
  
  if (rows.length === 0) return;

  const { error, data } = await supabase.from('wat_words').insert(rows).select();
  if (error) throw new Error(`WAT Insert Error: ${error.message}`);
  return data;
}

export async function getWATWords() {
  if (!isSupabaseActive || !supabase) return [];
  // Randomize retrieval if possible, or just get all and shuffle client side
  const { data } = await supabase.from('wat_words').select('*').order('created_at', { ascending: false });
  return data || [];
}

export async function deleteWATWord(id: string) {
  if (!isSupabaseActive || !supabase) return;
  await supabase.from('wat_words').delete().eq('id', id);
}
