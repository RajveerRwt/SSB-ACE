
import { createClient } from '@supabase/supabase-js';
import { PIQData, UserSubscription, PaymentRequest } from '../types';

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
    const { error } = await supabase.from('aspirants').upsert({
      user_id: userId,
      subscription_data: subData,
      last_active: new Date().toISOString()
    }, { onConflict: 'user_id' });

    if (error) {
       console.error("DB Update Failed:", error);
       throw new Error(`DB Update Failed: ${error.message}. Check RLS Policies.`);
    }
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

// --- PAYMENT & ADMIN APPROVAL ---

export async function submitPaymentRequest(userId: string, utr: string, amount: number, planType: 'PRO_SUBSCRIPTION' | 'INTERVIEW_ADDON') {
  // Handle Demo/Guest Users Gracefully
  if (userId.startsWith('demo')) {
      console.log("Demo user payment simulated.");
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      return true;
  }

  if (!isSupabaseActive || !supabase) {
      alert("Database inactive. Cannot submit request.");
      return false;
  }

  if (!userId) {
    throw new Error("User ID missing. Please login again.");
  }
  
  // 1. Save to Supabase
  const { error } = await supabase.from('payment_requests').insert({
    user_id: userId,
    utr: utr,
    amount: amount,
    plan_type: planType,
    status: 'PENDING'
  });

  if (error) {
    console.error("Payment Submit Error Details:", JSON.stringify(error, null, 2));
    
    if (error.code === '42501') {
        throw new Error("Permission Denied: Please check database policies.");
    } else if (error.code === '23505') {
        throw new Error("This UTR has already been submitted.");
    } else if (error.code === '22P02') {
        throw new Error("Invalid User ID format. Please re-login.");
    }
    
    throw new Error(error.message || "Failed to submit payment. Please try again.");
  }

  // 2. Send Email Notification to Admin (using Formspree)
  try {
    await fetch('https://formspree.io/f/mdaoqdqy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: "NEW PAYMENT RECEIVED - SSBPREP",
        message: `User ${userId} submitted a payment.\nUTR: ${utr}\nAmount: ₹${amount}\nPlan: ${planType}\n\nPlease check Admin Panel to approve.`,
        email: "system@ssbprep.online" 
      })
    });
  } catch (emailErr) {
    console.warn("Failed to send admin email notification", emailErr);
  }

  return true;
}

// USER: Check status of their own request
export async function getLatestPaymentRequest(userId: string) {
  if (!isSupabaseActive || !supabase || userId.startsWith('demo')) return null;
  
  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') return null; // PGRST116 = Row not found
  return data;
}

// ADMIN ONLY
export async function getPendingPayments() {
  if (!isSupabaseActive || !supabase) return [];
  
  const { data, error } = await supabase
    .from('payment_requests')
    .select('*, aspirants(email, full_name)') 
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });

  if (error) {
     console.error("Error fetching payments:", error);
     throw error;
  }
  return data || [];
}

// ADMIN ONLY
export async function approvePaymentRequest(requestId: string, userId: string, planType: 'PRO_SUBSCRIPTION' | 'INTERVIEW_ADDON') {
  if (!isSupabaseActive || !supabase) return false;

  // 1. Grant Benefits FIRST (Critical Step)
  // If this fails (e.g. Permissions), we should NOT mark as approved.
  await processPaymentSuccess(userId, planType);

  // 2. Mark as Approved
  const { error: updateError } = await supabase
    .from('payment_requests')
    .update({ status: 'APPROVED' })
    .eq('id', requestId);
  
  if (updateError) throw updateError;

  return true;
}

// ADMIN ONLY
export async function rejectPaymentRequest(requestId: string) {
  if (!isSupabaseActive || !supabase) return false;
  await supabase.from('payment_requests').update({ status: 'REJECTED' }).eq('id', requestId);
  return true;
}

export async function processPaymentSuccess(userId: string, planType: 'PRO_SUBSCRIPTION' | 'INTERVIEW_ADDON') {
  const sub = await getUserSubscription(userId);

  if (planType === 'PRO_SUBSCRIPTION') {
    sub.tier = 'PRO';
    const d = new Date();
    d.setDate(d.getDate() + 30);
    sub.expiryDate = d.toISOString();
    
    sub.usage.interview_limit = PRO_LIMITS.interview;
    sub.usage.ppdt_limit = PRO_LIMITS.ppdt;
    sub.usage.tat_limit = PRO_LIMITS.tat;
  } else if (planType === 'INTERVIEW_ADDON') {
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

export async function logoutUser() {
  if (isSupabaseActive && supabase) {
    await supabase.auth.signOut();
  }
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

export async function getUserData(userId: string): Promise<PIQData | null> {
  let localData: PIQData | null = null;
  try {
    const stored = localStorage.getItem(`ssb_data_${userId}`);
    if (stored) localData = JSON.parse(stored);
  } catch (e) {
    console.warn("Local storage read error", e);
  }

  if (userId.startsWith('demo')) return localData;

  if (isSupabaseActive && supabase) {
    try {
      const { data, error } = await supabase
        .from('aspirants')
        .select('piq_data')
        .eq('user_id', userId)
        .single();

      if (data && data.piq_data) {
          localStorage.setItem(`ssb_data_${userId}`, JSON.stringify(data.piq_data));
          return data.piq_data as PIQData;
      }
      
      if (error && error.code !== 'PGRST116') console.error("Supabase fetch error:", error);
    } catch (error) {
      console.error("Error loading user data from cloud:", error);
    }
  }
  
  return localData;
}

export async function saveUserData(userId: string, data: Partial<PIQData>) {
  try {
      const existing = localStorage.getItem(`ssb_data_${userId}`);
      let merged = data;
      if (existing) {
          const parsed = JSON.parse(existing);
          merged = { ...parsed, ...data };
      }
      localStorage.setItem(`ssb_data_${userId}`, JSON.stringify(merged));
  } catch(e) {}

  if (isSupabaseActive && supabase && !userId.startsWith('demo')) {
    const { error } = await supabase.from('aspirants').upsert({ 
      user_id: userId, 
      piq_data: data, 
      last_active: new Date().toISOString() 
    }, { onConflict: 'user_id' });
    return !error;
  }
  return true;
}

export async function saveTestAttempt(userId: string, testType: string, resultData: any) {
  if (isSupabaseActive && supabase && !userId.startsWith('demo')) {
    const { error } = await supabase.from('test_history').insert({
      user_id: userId,
      test_type: testType,
      score: resultData.score || 0,
      result_data: resultData
    });
    return !error;
  }
  return true;
}

export async function getUserHistory(userId: string) {
  if (isSupabaseActive && supabase && !userId.startsWith('demo')) {
    const { data } = await supabase
      .from('test_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) return data.map((item: any) => ({
      id: item.id,
      type: item.test_type,
      timestamp: item.created_at,
      score: item.score,
      result: item.result_data
    }));
  }
  return [];
}

export async function getPPDTScenarios() {
  if (isSupabaseActive && supabase) {
     const { data } = await supabase.from('ppdt_scenarios').select('*');
     return data || [];
  }
  return [];
}

export async function uploadPPDTScenario(file: File, description: string) {
  if (!isSupabaseActive || !supabase) return;
  const fileName = `${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from('ppdt-images').upload(fileName, file);
  if (uploadError) throw uploadError;
  const { data: { publicUrl } } = supabase.storage.from('ppdt-images').getPublicUrl(fileName);
  await supabase.from('ppdt_scenarios').insert({ image_url: publicUrl, description });
}

export async function deletePPDTScenario(id: string, url: string) {
  if (!isSupabaseActive || !supabase) return;
  await supabase.from('ppdt_scenarios').delete().eq('id', id);
  const path = url.split('/').pop();
  if (path) await supabase.storage.from('ppdt-images').remove([path]);
}

export async function getTATScenarios() {
  if (isSupabaseActive && supabase) {
     const { data } = await supabase.from('tat_scenarios').select('*');
     return data || [];
  }
  return [];
}

export async function uploadTATScenario(file: File, description: string, setTag: string) {
  if (!isSupabaseActive || !supabase) return;
  const fileName = `${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from('tat-images').upload(fileName, file);
  if (uploadError) throw uploadError;
  const { data: { publicUrl } } = supabase.storage.from('tat-images').getPublicUrl(fileName);
  await supabase.from('tat_scenarios').insert({ image_url: publicUrl, description, set_tag: setTag });
}

export async function deleteTATScenario(id: string, url: string) {
  if (!isSupabaseActive || !supabase) return;
  await supabase.from('tat_scenarios').delete().eq('id', id);
  const path = url.split('/').pop();
  if (path) await supabase.storage.from('tat-images').remove([path]);
}

export async function getWATWords() {
  if (isSupabaseActive && supabase) {
     const { data } = await supabase.from('wat_words').select('*');
     return data || [];
  }
  return [];
}

export async function uploadWATWords(words: string[]) {
  if (!isSupabaseActive || !supabase) return;
  const payload = words.map(w => ({ word: w }));
  await supabase.from('wat_words').insert(payload);
}

export async function deleteWATWord(id: string) {
  if (!isSupabaseActive || !supabase) return;
  await supabase.from('wat_words').delete().eq('id', id);
}
