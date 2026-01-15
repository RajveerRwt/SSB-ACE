
import { createClient, User } from '@supabase/supabase-js';
import { PIQData, UserSubscription } from '../types';

// --- INITIALIZATION ---
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_KEY || '';
const ADMIN_EMAIL = 'rajveerrawat947@gmail.com';

let supabase: any = null;
let isSupabaseActive = false;

if (SUPABASE_URL && SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    isSupabaseActive = true;
  } catch (e) {
    console.error("Supabase Init Error:", e);
  }
}

// --- AUTHENTICATION ---

export const signUpWithEmail = async (email: string, pass: string, fullName: string) => {
  if (!isSupabaseActive) throw new Error("Database not connected");
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
    options: { data: { full_name: fullName } }
  });
  return { data, error };
};

export const signInWithEmail = async (email: string, pass: string) => {
  if (!isSupabaseActive) throw new Error("Database not connected");
  return await supabase.auth.signInWithPassword({ email, password: pass });
};

export const logoutUser = async () => {
  if (isSupabaseActive) await supabase.auth.signOut();
};

export const checkAuthSession = async () => {
  if (!isSupabaseActive) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!isSupabaseActive) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
    callback(session?.user || null);
  });
  return () => subscription.unsubscribe();
};

export const isUserAdmin = (email: string | null | undefined) => {
  return email === ADMIN_EMAIL;
};

// --- USER PROFILE & DATA ---

export const syncUserProfile = async (user: User) => {
  if (!isSupabaseActive) return;
  // Ensure user exists in aspirants table
  const { error } = await supabase.from('aspirants').upsert({
    user_id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name,
    last_active: new Date().toISOString()
  }, { onConflict: 'user_id', ignoreDuplicates: true }); 
  
  if (error) console.error("Sync Profile Error", error);
};

export const getUserData = async (userId: string): Promise<PIQData | null> => {
  if (!isSupabaseActive) return null;
  const { data } = await supabase.from('aspirants').select('piq_data').eq('user_id', userId).single();
  return data?.piq_data || null;
};

export const saveUserData = async (userId: string, data: PIQData) => {
  if (!isSupabaseActive) return;
  await supabase.from('aspirants').update({ piq_data: data }).eq('user_id', userId);
};

export const getUserSubscription = async (userId: string): Promise<UserSubscription> => {
    const defaultSub: UserSubscription = {
        tier: 'FREE',
        expiryDate: null,
        usage: {
            interview_used: 0, interview_limit: 1,
            ppdt_used: 0, ppdt_limit: 5,
            tat_used: 0, tat_limit: 2,
            wat_used: 0, srt_used: 0, sdt_used: 0
        },
        extra_credits: { interview: 0 }
    };

    if (!isSupabaseActive) return defaultSub;

    const { data } = await supabase.from('aspirants').select('subscription_data').eq('user_id', userId).single();
    return data?.subscription_data || defaultSub;
};

// --- TEST HISTORY ---

export const saveTestAttempt = async (userId: string, testType: string, result: any) => {
  if (!isSupabaseActive) return;
  await supabase.from('test_history').insert({
    user_id: userId,
    test_type: testType,
    score: result.score || 0,
    result_data: result
  });
};

export const getUserHistory = async (userId: string) => {
  if (!isSupabaseActive) return [];
  const { data } = await supabase.from('test_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
  return data?.map((d: any) => ({
      id: d.id,
      type: d.test_type,
      score: d.score,
      timestamp: d.created_at,
      result: d.result_data
  })) || [];
};

// --- LIMITS & USAGE ---

export const checkLimit = async (userId: string, testType: string): Promise<{allowed: boolean, message: string}> => {
    if (!isSupabaseActive) return { allowed: true, message: "Offline Mode" };
    
    const sub = await getUserSubscription(userId);
    
    if (sub.tier === 'PRO') {
        // PRO logic can be added here
    }

    if (testType === 'INTERVIEW') {
        const total = sub.usage.interview_limit + (sub.extra_credits?.interview || 0);
        if (sub.usage.interview_used >= total) return { allowed: false, message: "Interview credits exhausted. Please upgrade or buy add-ons." };
    } else if (testType === 'PPDT') {
        if (sub.usage.ppdt_used >= sub.usage.ppdt_limit) return { allowed: false, message: "PPDT limit reached for this plan." };
    } else if (testType === 'TAT') {
        if (sub.usage.tat_used >= sub.usage.tat_limit) return { allowed: false, message: "TAT limit reached for this plan." };
    }
    
    return { allowed: true, message: "Allowed" };
};

export const incrementUsage = async (userId: string, testType: string) => {
    if (!isSupabaseActive) return;
    
    const sub = await getUserSubscription(userId);
    const newUsage = { ...sub.usage };
    
    if (testType === 'INTERVIEW') newUsage.interview_used += 1;
    else if (testType === 'PPDT') newUsage.ppdt_used += 1;
    else if (testType === 'TAT') newUsage.tat_used += 1;
    else if (testType === 'WAT') newUsage.wat_used += 1;
    else if (testType === 'SRT') newUsage.srt_used += 1;
    else if (testType === 'SDT') newUsage.sdt_used += 1;

    await supabase.from('aspirants').update({ 
        subscription_data: { ...sub, usage: newUsage } 
    }).eq('user_id', userId);
};


// --- CONTENT MANAGEMENT (ADMIN) ---

// PPDT
export const getPPDTScenarios = async () => {
    if (!isSupabaseActive) return [];
    const { data } = await supabase.from('ppdt_scenarios').select('*').order('created_at', { ascending: false });
    return data || [];
};

export const uploadPPDTScenario = async (file: File, desc: string) => {
    if (!isSupabaseActive) return;
    const fileName = `ppdt-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('ppdt-images').upload(fileName, file);
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage.from('ppdt-images').getPublicUrl(fileName);
    
    await supabase.from('ppdt_scenarios').insert({
        image_url: publicUrl,
        description: desc
    });
};

export const deletePPDTScenario = async (id: string, url: string) => {
    if (!isSupabaseActive) return;
    const path = url.split('/').pop();
    if(path) await supabase.storage.from('ppdt-images').remove([path]);
    await supabase.from('ppdt_scenarios').delete().eq('id', id);
};

// TAT
export const getTATScenarios = async () => {
    if (!isSupabaseActive) return [];
    const { data } = await supabase.from('tat_scenarios').select('*').order('created_at', { ascending: false });
    return data || [];
};

export const uploadTATScenario = async (file: File, desc: string, setTag: string) => {
    if (!isSupabaseActive) return;
    const fileName = `tat-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('tat-images').upload(fileName, file);
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage.from('tat-images').getPublicUrl(fileName);
    
    await supabase.from('tat_scenarios').insert({
        image_url: publicUrl,
        description: desc,
        set_tag: setTag
    });
};

export const deleteTATScenario = async (id: string, url: string) => {
    if (!isSupabaseActive) return;
    const path = url.split('/').pop();
    if(path) await supabase.storage.from('tat-images').remove([path]);
    await supabase.from('tat_scenarios').delete().eq('id', id);
};

// WAT
export const getWATWords = async () => {
    if (!isSupabaseActive) return [];
    const { data } = await supabase.from('wat_words').select('*').order('created_at', { ascending: false });
    return data || [];
};

export const uploadWATWords = async (words: string[], setTag: string = 'General') => {
  if (!isSupabaseActive || !supabase) return;
  const payload = words.map(w => ({ word: w, set_tag: setTag }));
  await supabase.from('wat_words').insert(payload);
};

export const deleteWATWord = async (id: string) => {
  if (!isSupabaseActive || !supabase) return;
  await supabase.from('wat_words').delete().eq('id', id);
};

export const deleteWATSet = async (setTag: string) => {
  if (!isSupabaseActive || !supabase) return;
  await supabase.from('wat_words').delete().eq('set_tag', setTag);
};

// --- PAYMENTS ---

export const getLatestPaymentRequest = async (userId: string) => {
    if (!isSupabaseActive) return null;
    const { data } = await supabase.from('payment_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single();
    return data;
};

export const submitPaymentRequest = async (userId: string, utr: string, amount: number, planType: string) => {
    if (!isSupabaseActive) throw new Error("Service Offline");
    
    // Check if UTR already exists
    const { data: existing } = await supabase.from('payment_requests').select('id').eq('utr', utr).single();
    if (existing) throw new Error("This UTR has already been submitted.");

    const { error } = await supabase.from('payment_requests').insert({
        user_id: userId,
        utr: utr,
        amount: amount,
        plan_type: planType,
        status: 'PENDING'
    });
    
    if (error) throw error;
};

export const getPendingPayments = async () => {
    if (!isSupabaseActive) return [];
    const { data } = await supabase.from('payment_requests').select('*, aspirants(full_name, email)').eq('status', 'PENDING');
    return data || [];
};

export const approvePaymentRequest = async (requestId: string, userId: string, planType: string) => {
    if (!isSupabaseActive) return;
    
    // 1. Update Request Status
    const { error } = await supabase.from('payment_requests').update({ status: 'APPROVED' }).eq('id', requestId);
    if (error) throw error;

    // 2. Update User Subscription
    const sub = await getUserSubscription(userId);
    const newSub = { ...sub };

    if (planType === 'PRO_SUBSCRIPTION') {
        newSub.tier = 'PRO';
        // Reset or increase limits for PRO
        newSub.usage.interview_limit = 5;
        newSub.usage.ppdt_limit = 20;
        newSub.usage.tat_limit = 7;
    } else if (planType === 'INTERVIEW_ADDON') {
        newSub.extra_credits.interview = (newSub.extra_credits.interview || 0) + 1;
    }

    await supabase.from('aspirants').update({ subscription_data: newSub }).eq('user_id', userId);
};

export const rejectPaymentRequest = async (requestId: string) => {
    if (!isSupabaseActive) return;
    await supabase.from('payment_requests').update({ status: 'REJECTED' }).eq('id', requestId);
};
