
import { createClient, User } from '@supabase/supabase-js';
import { PIQData, UserSubscription } from '../types';

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_KEY || '';

// Create a single supabase client for interacting with your database
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

export const isSupabaseActive = !!supabase;

// --- AUTHENTICATION ---

export const checkAuthSession = async () => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!supabase) return null;
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  return () => subscription.unsubscribe();
};

export const signInWithEmail = async (email: string, password: string) => {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase.auth.signInWithPassword({ email, password });
};

export const signUpWithEmail = async (email: string, password: string, fullName: string) => {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });
};

export const logoutUser = async () => {
  if (supabase) await supabase.auth.signOut();
};

export const isUserAdmin = (email: string | null | undefined) => {
  // Hardcoded admin email for now, or check specific claims/roles
  return email === 'rajveerrawat947@gmail.com';
};

// --- USER PROFILE & DATA ---

export const syncUserProfile = async (user: User) => {
    if (!supabase) return;
    // Upsert basic info
    await supabase.from('aspirants').upsert({
        user_id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name,
        last_active: new Date().toISOString()
    }, { onConflict: 'user_id' });
};

export const getUserData = async (userId: string): Promise<PIQData | null> => {
  if (!supabase) return null;
  const { data } = await supabase.from('aspirants').select('piq_data').eq('user_id', userId).single();
  return data?.piq_data || null;
};

export const saveUserData = async (userId: string, data: Partial<PIQData>) => {
  if (!supabase) return;
  await supabase.from('aspirants').update({ piq_data: data }).eq('user_id', userId);
};

export const saveTestAttempt = async (userId: string, testType: string, resultData: any) => {
  if (!supabase) return;
  await supabase.from('test_history').insert({
    user_id: userId,
    test_type: testType,
    score: resultData.score || 0,
    result_data: resultData
  });
};

export const getUserHistory = async (userId: string) => {
  if (!supabase) return [];
  const { data } = await supabase
    .from('test_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  return (data || []).map((item: any) => ({
    id: item.id,
    type: item.test_type,
    timestamp: item.created_at,
    score: item.score,
    result: item.result_data
  }));
};

// --- ADMIN USER MANAGEMENT ---

export const getAllUsers = async () => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('aspirants')
    .select('*')
    .order('last_active', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const deleteUserProfile = async (userId: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('aspirants').delete().eq('user_id', userId);
  if (error) throw error;
};

// --- SUBSCRIPTION & LIMITS ---

const DEFAULT_LIMITS = {
    interview: 2,
    ppdt: 10,
    tat: 2,
    wat: 3, 
    srt: 3, 
    sdt: 999 
};

const STANDARD_LIMITS = {
    interview: 2,
    ppdt: 10,
    tat: 4,
    wat: 5,
    srt: 5,
    sdt: 999
};

const PRO_LIMITS = {
    interview: 5,
    ppdt: 30,
    tat: 7,
    wat: 10,
    srt: 10, 
    sdt: 999 
};

export const getUserSubscription = async (userId: string): Promise<UserSubscription> => {
    if (!supabase) return { 
        tier: 'FREE', 
        expiryDate: null, 
        usage: { 
            interview_used: 0, interview_limit: DEFAULT_LIMITS.interview, 
            ppdt_used: 0, ppdt_limit: DEFAULT_LIMITS.ppdt, 
            tat_used: 0, tat_limit: DEFAULT_LIMITS.tat, 
            wat_used: 0, wat_limit: DEFAULT_LIMITS.wat, 
            srt_used: 0, srt_limit: DEFAULT_LIMITS.srt, 
            sdt_used: 0 
        }, 
        extra_credits: { interview: 0 } 
    };
    
    const { data } = await supabase.from('aspirants').select('subscription_data').eq('user_id', userId).single();
    const sub = data?.subscription_data || {};
    
    // Defaults
    const tier = sub.tier || 'FREE';
    
    let limits = DEFAULT_LIMITS;
    if (tier === 'PRO') limits = PRO_LIMITS;
    else if (tier === 'STANDARD') limits = STANDARD_LIMITS;
    
    return {
        tier,
        expiryDate: sub.expiryDate || null,
        usage: {
            interview_used: sub.usage?.interview_used || 0,
            interview_limit: limits.interview,
            ppdt_used: sub.usage?.ppdt_used || 0,
            ppdt_limit: limits.ppdt,
            tat_used: sub.usage?.tat_used || 0,
            tat_limit: limits.tat,
            wat_used: sub.usage?.wat_used || 0,
            wat_limit: limits.wat,
            srt_used: sub.usage?.srt_used || 0,
            srt_limit: limits.srt,
            sdt_used: sub.usage?.sdt_used || 0,
        },
        extra_credits: {
            interview: sub.extra_credits?.interview || 0
        }
    };
};

export const checkLimit = async (userId: string, testType: string): Promise<{allowed: boolean, message: string}> => {
    const sub = await getUserSubscription(userId);
    let allowed = false;
    let message = '';
    
    if (testType.includes('INTERVIEW')) {
        const totalLimit = sub.usage.interview_limit + sub.extra_credits.interview;
        if (sub.usage.interview_used < totalLimit) allowed = true;
        else message = "Interview limit reached. Upgrade to Standard/Pro or buy add-ons.";
    } else if (testType.includes('PPDT')) {
        if (sub.usage.ppdt_used < sub.usage.ppdt_limit) allowed = true;
        else message = "PPDT limit reached. Upgrade Subscription.";
    } else if (testType.includes('TAT')) {
        if (sub.usage.tat_used < sub.usage.tat_limit) allowed = true;
        else message = "TAT limit reached. Upgrade Subscription.";
    } else if (testType.includes('WAT')) {
        if (sub.usage.wat_used < sub.usage.wat_limit) allowed = true;
        else message = "WAT set limit reached. Upgrade Subscription.";
    } else if (testType.includes('SRT')) {
        if (sub.usage.srt_used < sub.usage.srt_limit) allowed = true;
        else message = "SRT set limit reached. Upgrade Subscription.";
    } else {
        allowed = true; // Others unlimited
    }
    
    return { allowed, message };
};

export const incrementUsage = async (userId: string, testType: string) => {
    if (!supabase) return;
    const { data } = await supabase.from('aspirants').select('subscription_data').eq('user_id', userId).single();
    let sub = data?.subscription_data || { tier: 'FREE', usage: {}, extra_credits: {} };
    if (!sub.usage) sub.usage = {};
    
    if (testType.includes('INTERVIEW')) sub.usage.interview_used = (sub.usage.interview_used || 0) + 1;
    else if (testType.includes('PPDT')) sub.usage.ppdt_used = (sub.usage.ppdt_used || 0) + 1;
    else if (testType.includes('TAT')) sub.usage.tat_used = (sub.usage.tat_used || 0) + 1;
    else if (testType.includes('WAT')) sub.usage.wat_used = (sub.usage.wat_used || 0) + 1;
    else if (testType.includes('SRT')) sub.usage.srt_used = (sub.usage.srt_used || 0) + 1;
    else if (testType.includes('SDT')) sub.usage.sdt_used = (sub.usage.sdt_used || 0) + 1;

    await supabase.from('aspirants').update({ subscription_data: sub }).eq('user_id', userId);
};

// --- CONTENT MANAGEMENT (PPDT, TAT, WAT, SRT) ---

// PPDT
export const getPPDTScenarios = async () => {
    if (!supabase) return [];
    const { data } = await supabase.from('ppdt_scenarios').select('*').order('created_at', { ascending: false });
    return data || [];
};

export const uploadPPDTScenario = async (file: File, description: string) => {
    if (!supabase) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage.from('ppdt-images').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('ppdt-images').getPublicUrl(filePath);

    const { error } = await supabase.from('ppdt_scenarios').insert({
        image_url: publicUrl,
        description
    });
    if (error) throw error;
};

export const deletePPDTScenario = async (id: string, url: string) => {
    if (!supabase) return;
    await supabase.from('ppdt_scenarios').delete().eq('id', id);
};

// TAT
export const getTATScenarios = async () => {
    if (!supabase) return [];
    const { data } = await supabase.from('tat_scenarios').select('*').order('created_at', { ascending: false });
    return data || [];
};

export const uploadTATScenario = async (file: File, description: string, setTag: string) => {
    if (!supabase) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage.from('tat-images').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('tat-images').getPublicUrl(filePath);

    const { error } = await supabase.from('tat_scenarios').insert({
        image_url: publicUrl,
        description,
        set_tag: setTag
    });
    if (error) throw error;
};

export const deleteTATScenario = async (id: string, url: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('tat_scenarios').delete().eq('id', id);
    if (error) throw error;
};

// WAT
export const getWATWords = async () => {
    if (!supabase) return [];
    const { data } = await supabase.from('wat_words').select('*').order('created_at', { ascending: false });
    return data || [];
};

export const uploadWATWords = async (words: string[], setTag: string = 'General') => {
  if (!supabase) return;
  const payload = words.map(w => ({ word: w, set_tag: setTag }));
  const { error } = await supabase.from('wat_words').insert(payload);
  if (error) throw error;
};

export const deleteWATWord = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('wat_words').delete().eq('id', id);
  if (error) throw error;
};

export const deleteWATSet = async (setTag: string) => {
  if (!supabase) throw new Error("Database connection unavailable");
  
  if (setTag === 'General') {
     const { error: err1 } = await supabase.from('wat_words').delete().eq('set_tag', 'General');
     if (err1) throw err1;
     
     const { error: err2 } = await supabase.from('wat_words').delete().is('set_tag', null);
     if (err2) throw err2;
  } else {
     const { error } = await supabase.from('wat_words').delete().eq('set_tag', setTag);
     if (error) throw error;
  }
};

// SRT
export const getSRTQuestions = async () => {
    if (!supabase) return [];
    const { data } = await supabase.from('srt_questions').select('*').order('created_at', { ascending: false });
    return data || [];
};

export const uploadSRTQuestions = async (questions: string[], setTag: string = 'General') => {
  if (!supabase) return;
  const payload = questions.map(q => ({ question: q, set_tag: setTag }));
  const { error } = await supabase.from('srt_questions').insert(payload);
  if (error) throw error;
};

export const deleteSRTQuestion = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('srt_questions').delete().eq('id', id);
  if (error) throw error;
};

export const deleteSRTSet = async (setTag: string) => {
  if (!supabase) throw new Error("Database connection unavailable");
  
  if (setTag === 'General') {
     const { error: err1 } = await supabase.from('srt_questions').delete().eq('set_tag', 'General');
     if (err1) throw err1;
     
     const { error: err2 } = await supabase.from('srt_questions').delete().is('set_tag', null);
     if (err2) throw err2;
  } else {
     const { error } = await supabase.from('srt_questions').delete().eq('set_tag', setTag);
     if (error) throw error;
  }
};

// --- COUPON MANAGEMENT ---

export const getCoupons = async () => {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
};

export const createCoupon = async (code: string, discount: number, influencer: string) => {
    if (!supabase) throw new Error("Database not connected");
    const { error } = await supabase.from('coupons').insert({
        code: code.toUpperCase(),
        discount_percent: discount,
        influencer_name: influencer,
        usage_count: 0
    });
    if (error) throw error;
};

export const deleteCoupon = async (code: string) => {
    if (!supabase) throw new Error("Database not connected");
    const { error } = await supabase.from('coupons').delete().eq('code', code);
    if (error) throw error;
};

export const validateCoupon = async (code: string) => {
    if (!supabase) return { valid: false, discount: 0, message: 'Database Unavailable' };
    
    const { data, error } = await supabase
        .from('coupons')
        .select('discount_percent')
        .eq('code', code.toUpperCase())
        .single();
        
    if (error || !data) {
        return { valid: false, discount: 0, message: 'Invalid or Expired Code' };
    }
    
    return { valid: true, discount: data.discount_percent, message: `Success! ${data.discount_percent}% Discount Applied.` };
};

// --- PAYMENTS (MANUAL & RAZORPAY) ---

// Manual UTR submission (Keeping for fallback if needed, but primary is now Razorpay)
export const submitPaymentRequest = async (userId: string, utr: string, amount: number, planType: string, couponCode: string = '') => {
    if (!supabase) throw new Error("Database not connected");
    const { error } = await supabase.from('payment_requests').insert({
        user_id: userId,
        utr,
        amount,
        plan_type: planType,
        coupon_code: couponCode || null,
        status: 'PENDING'
    });
    
    if (error) {
        if (error.code === '23505') throw new Error("This transaction ID has already been processed.");
        throw error;
    }

    if (couponCode) {
        const { error: incrementError } = await supabase.rpc('increment_coupon_usage', { code_input: couponCode });
        if (incrementError) {
             const { data: c } = await supabase.from('coupons').select('usage_count').eq('code', couponCode).single();
             if (c) {
                 await supabase.from('coupons').update({ usage_count: (c.usage_count || 0) + 1 }).eq('code', couponCode);
             }
        }
    }
};

/**
 * processRazorpayTransaction
 * Records a successful Razorpay transaction and automatically applies the plan upgrade.
 * Note: In a production environment with sensitive secrets, signature verification should be done on a backend/Edge function.
 * Since this is a client-side integration pattern for this specific app structure, we perform the update here.
 */
export const processRazorpayTransaction = async (userId: string, paymentId: string, amount: number, planType: string, couponCode: string = '') => {
    if (!supabase) throw new Error("Database not connected");

    // 1. Record the Transaction as APPROVED
    const { error } = await supabase.from('payment_requests').insert({
        user_id: userId,
        utr: paymentId, // Storing Razorpay Payment ID as UTR
        amount,
        plan_type: planType,
        coupon_code: couponCode || null,
        status: 'APPROVED' // Auto-approve
    });

    if (error) {
        // If duplicate (already processed), just return success to not block user UI
        if (error.code === '23505') return;
        throw error;
    }

    // 2. Increment Coupon if used
    if (couponCode) {
        const { data: c } = await supabase.from('coupons').select('usage_count').eq('code', couponCode).single();
        if (c) {
            await supabase.from('coupons').update({ usage_count: (c.usage_count || 0) + 1 }).eq('code', couponCode);
        }
    }

    // 3. Upgrade User Subscription Immediately
    const { data } = await supabase.from('aspirants').select('subscription_data').eq('user_id', userId).single();
    let sub = data?.subscription_data || { tier: 'FREE', usage: {}, extra_credits: {} };
    
    if (planType === 'PRO_SUBSCRIPTION') {
        sub.tier = 'PRO';
    } else if (planType === 'STANDARD_SUBSCRIPTION') {
        sub.tier = 'STANDARD';
    } else if (planType === 'INTERVIEW_ADDON') {
        sub.extra_credits = sub.extra_credits || {};
        sub.extra_credits.interview = (sub.extra_credits.interview || 0) + 1;
    }
    
    await supabase.from('aspirants').update({ subscription_data: sub }).eq('user_id', userId);
};

export const getLatestPaymentRequest = async (userId: string) => {
    if (!supabase) return null;
    const { data } = await supabase.from('payment_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    return data;
};

export const getPendingPayments = async () => {
    if (!supabase) return [];
    const { data } = await supabase.from('payment_requests')
        .select('*, aspirants(full_name, email)')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });
    return data || [];
};

export const approvePaymentRequest = async (id: string, userId: string, planType: string) => {
    if (!supabase) return;
    
    // 1. Update Payment Status
    const { error } = await supabase.from('payment_requests').update({ status: 'APPROVED' }).eq('id', id);
    if (error) throw error;
    
    // 2. Update User Subscription
    const { data } = await supabase.from('aspirants').select('subscription_data').eq('user_id', userId).single();
    let sub = data?.subscription_data || { tier: 'FREE', usage: {}, extra_credits: {} };
    
    if (planType === 'PRO_SUBSCRIPTION') {
        sub.tier = 'PRO';
    } else if (planType === 'STANDARD_SUBSCRIPTION') {
        sub.tier = 'STANDARD';
    } else if (planType === 'INTERVIEW_ADDON') {
        sub.extra_credits = sub.extra_credits || {};
        sub.extra_credits.interview = (sub.extra_credits.interview || 0) + 1;
    }
    
    await supabase.from('aspirants').update({ subscription_data: sub }).eq('user_id', userId);
};

export const rejectPaymentRequest = async (id: string) => {
    if (!supabase) return;
    await supabase.from('payment_requests').update({ status: 'REJECTED' }).eq('id', id);
};
