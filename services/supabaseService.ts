
import { createClient } from '@supabase/supabase-js';
import { PIQData, UserSubscription, Announcement } from '../types';

// Initialize Supabase Client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- AUTHENTICATION ---

export const signInWithEmail = async (email, password) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signUpWithEmail = async (email, password, fullName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });
  return { data, error };
};

export const logoutUser = async () => {
  return await supabase.auth.signOut();
};

export const checkAuthSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
};

export const subscribeToAuthChanges = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  return () => subscription.unsubscribe();
};

export const isUserAdmin = (email) => {
  // Simple check for now, can be replaced with RLS or a table check
  const adminEmails = ['admin@ssbprep.online', 'contact.ssbprep@gmail.com']; 
  return adminEmails.includes(email || '');
};

export const syncUserProfile = async (user) => {
  if (!user) return;
  
  // Check if profile exists, if not create it
  const { data } = await supabase.from('aspirants').select('user_id').eq('user_id', user.id).single();
  
  if (!data) {
    await supabase.from('aspirants').insert({
      user_id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || '',
      last_active: new Date().toISOString()
    });
  } else {
    await supabase.from('aspirants').update({ last_active: new Date().toISOString() }).eq('user_id', user.id);
  }
};

// --- USER DATA (PIQ) ---

export const getUserData = async (userId) => {
  const { data, error } = await supabase.from('aspirants').select('piq_data').eq('user_id', userId).single();
  if (error) return null;
  return data?.piq_data;
};

export const saveUserData = async (userId, piqData) => {
  const { error } = await supabase.from('aspirants').update({ piq_data: piqData }).eq('user_id', userId);
  return error;
};

// --- TEST HISTORY & STREAKS ---

export const getUserHistory = async (userId) => {
  const { data, error } = await supabase
    .from('test_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) return [];
  
  return data.map(item => ({
      type: item.test_type,
      score: item.score,
      timestamp: item.created_at,
      result: item.result_data
  }));
};

export const saveTestAttempt = async (userId, testType, result) => {
  await supabase.from('test_history').insert({
    user_id: userId,
    test_type: testType,
    score: result.score || 0,
    result_data: result
  });
};

export const getUserStreak = async (userId) => {
    const { data } = await supabase.from('aspirants').select('streak_count').eq('user_id', userId).single();
    return data || { streak_count: 0 };
};

// --- ADMIN: USERS ---

export const getAllUsers = async () => {
    const { data } = await supabase.from('aspirants').select('*');
    // Fetch subscription data for each user
    if (data) {
        for (let user of data) {
            const sub = await getUserSubscription(user.user_id);
            user.subscription_data = sub;
        }
    }
    return data || [];
};

export const deleteUserProfile = async (userId) => {
    await supabase.from('aspirants').delete().eq('user_id', userId);
};

// --- SUBSCRIPTION & LIMITS ---

const DEFAULT_SUBSCRIPTION: UserSubscription = {
    tier: 'FREE',
    expiryDate: null,
    usage: {
        interview_used: 0,
        interview_limit: 1, // Free limit
        ppdt_used: 0,
        ppdt_limit: 5,
        tat_used: 0,
        tat_limit: 2,
        wat_used: 0,
        wat_limit: 2,
        srt_used: 0,
        srt_limit: 2,
        sdt_used: 0
    },
    extra_credits: {
        interview: 0
    }
};

export const getUserSubscription = async (userId: string): Promise<UserSubscription> => {
    const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId).single();
    
    if (!data) return DEFAULT_SUBSCRIPTION;
    
    return {
        tier: data.tier || 'FREE',
        expiryDate: data.expiry_date,
        usage: {
            interview_used: data.interview_used || 0,
            interview_limit: data.interview_limit || 1,
            ppdt_used: data.ppdt_used || 0,
            ppdt_limit: data.ppdt_limit || 5,
            tat_used: data.tat_used || 0,
            tat_limit: data.tat_limit || 2,
            wat_used: data.wat_used || 0,
            wat_limit: data.wat_limit || 2,
            srt_used: data.srt_used || 0,
            srt_limit: data.srt_limit || 2,
            sdt_used: data.sdt_used || 0
        },
        extra_credits: {
            interview: data.extra_interview_credits || 0
        }
    };
};

export const checkLimit = async (userId: string, testType: string) => {
    const sub = await getUserSubscription(userId);
    let allowed = false;
    let message = "Limit reached. Upgrade to Pro.";
    
    if (testType === 'INTERVIEW') {
        if (sub.usage.interview_used < (sub.usage.interview_limit + sub.extra_credits.interview)) {
            allowed = true;
        }
    } else if (testType === 'PPDT') {
        if (sub.usage.ppdt_used < sub.usage.ppdt_limit) allowed = true;
    } else if (testType === 'TAT') {
        if (sub.usage.tat_used < sub.usage.tat_limit) allowed = true;
    } else {
        allowed = true; 
    }
    
    return { allowed, message };
};

export const incrementUsage = async (userId: string, testType: string) => {
    let column = '';
    if (testType === 'INTERVIEW') column = 'interview_used';
    else if (testType === 'PPDT') column = 'ppdt_used';
    else if (testType === 'TAT') column = 'tat_used';
    
    if (column) {
       const { data } = await supabase.from('subscriptions').select(column).eq('user_id', userId).single();
       if (data) {
           const current = data[column] || 0;
           await supabase.from('subscriptions').update({ [column]: current + 1 }).eq('user_id', userId);
       } else {
           // If subscription record doesn't exist, create a free one and increment
           await supabase.from('subscriptions').insert({ user_id: userId, [column]: 1 });
       }
    }
};

// --- PAYMENTS ---

export const getLatestPaymentRequest = async (userId: string) => {
    const { data } = await supabase.from('payment_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    return data;
};

export const getPendingPayments = async () => {
    const { data } = await supabase.from('payment_requests').select('*, aspirants(full_name, email)').eq('status', 'PENDING');
    return data || [];
};

export const approvePaymentRequest = async (requestId, userId, planType) => {
    await supabase.from('payment_requests').update({ status: 'APPROVED' }).eq('id', requestId);
    
    if (planType === 'PRO_SUBSCRIPTION') {
        const proDefaults = {
            tier: 'PRO',
            interview_limit: 5,
            ppdt_limit: 30,
            tat_limit: 7,
            wat_limit: 10,
            srt_limit: 10
        };
        const { error } = await supabase.from('subscriptions').upsert({ user_id: userId, ...proDefaults }, { onConflict: 'user_id' });
        if(error) console.error("Sub upsert error", error);
    } else if (planType === 'INTERVIEW_ADDON') {
        const { data } = await supabase.from('subscriptions').select('extra_interview_credits').eq('user_id', userId).single();
        const current = data?.extra_interview_credits || 0;
        await supabase.from('subscriptions').update({ extra_interview_credits: current + 1 }).eq('user_id', userId);
    }
};

export const rejectPaymentRequest = async (requestId) => {
    await supabase.from('payment_requests').update({ status: 'REJECTED' }).eq('id', requestId);
};

export const processRazorpayTransaction = async (userId, paymentId, amount, planType, couponCode) => {
    const { data, error } = await supabase.from('payment_requests').insert({
        user_id: userId,
        utr: paymentId,
        amount: amount,
        plan_type: planType,
        status: 'APPROVED'
    }).select().single();
    
    if (error) throw error;
    
    await approvePaymentRequest(data.id, userId, planType);
    
    if (couponCode) {
        const { data: c } = await supabase.from('coupons').select('usage_count').eq('code', couponCode).single();
        if (c) {
            await supabase.from('coupons').update({ usage_count: c.usage_count + 1 }).eq('code', couponCode);
        }
    }
};

// --- SCENARIO MANAGEMENT ---

// PPDT
export const getPPDTScenarios = async () => {
    const { data } = await supabase.from('ppdt_scenarios').select('*');
    return data || [];
};

export const uploadPPDTScenario = async (file, description) => {
    const fileName = `ppdt-${Date.now()}-${file.name}`;
    await supabase.storage.from('scenarios').upload(fileName, file);
    const { data: { publicUrl } } = supabase.storage.from('scenarios').getPublicUrl(fileName);
    
    await supabase.from('ppdt_scenarios').insert({
        image_url: publicUrl,
        description: description
    });
};

export const deletePPDTScenario = async (id, url) => {
    await supabase.from('ppdt_scenarios').delete().eq('id', id);
};

// TAT
export const getTATScenarios = async () => {
    const { data } = await supabase.from('tat_scenarios').select('*');
    return data || [];
};

export const uploadTATScenario = async (file, description, setTag) => {
    const fileName = `tat-${Date.now()}-${file.name}`;
    await supabase.storage.from('scenarios').upload(fileName, file);
    const { data: { publicUrl } } = supabase.storage.from('scenarios').getPublicUrl(fileName);
    
    await supabase.from('tat_scenarios').insert({
        image_url: publicUrl,
        description: description,
        set_tag: setTag
    });
};

export const deleteTATScenario = async (id, url) => {
    await supabase.from('tat_scenarios').delete().eq('id', id);
};

// WAT
export const getWATWords = async () => {
    const { data } = await supabase.from('wat_words').select('*');
    return data || [];
};

export const uploadWATWords = async (words, setTag) => {
    const rows = words.map(w => ({ word: w, set_tag: setTag }));
    await supabase.from('wat_words').insert(rows);
};

export const deleteWATWord = async (id) => {
    await supabase.from('wat_words').delete().eq('id', id);
};

export const deleteWATSet = async (tag) => {
    await supabase.from('wat_words').delete().eq('set_tag', tag);
};

// SRT
export const getSRTQuestions = async () => {
    const { data } = await supabase.from('srt_questions').select('*');
    return data || [];
};

export const uploadSRTQuestions = async (questions, setTag) => {
    const rows = questions.map(q => ({ question: q, set_tag: setTag }));
    await supabase.from('srt_questions').insert(rows);
};

export const deleteSRTQuestion = async (id) => {
    await supabase.from('srt_questions').delete().eq('id', id);
};

export const deleteSRTSet = async (tag) => {
    await supabase.from('srt_questions').delete().eq('set_tag', tag);
};

// --- COUPONS ---

export const getCoupons = async () => {
    const { data } = await supabase.from('coupons').select('*');
    return data || [];
};

export const createCoupon = async (code, discount, influencer) => {
    await supabase.from('coupons').insert({
        code,
        discount_percent: discount,
        influencer_name: influencer,
        usage_count: 0
    });
};

export const deleteCoupon = async (code) => {
    await supabase.from('coupons').delete().eq('code', code);
};

export const validateCoupon = async (code) => {
    const { data } = await supabase.from('coupons').select('*').eq('code', code).single();
    if (data) {
        return { valid: true, discount: data.discount_percent, message: `Coupon Applied! ${data.discount_percent}% OFF` };
    }
    return { valid: false, discount: 0, message: "Invalid Coupon Code" };
};

// --- ANNOUNCEMENTS ---

export const getRecentAnnouncements = async () => {
    const { data } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5);
    return data || [];
};

export const subscribeToAnnouncements = (callback) => {
    const channel = supabase.channel('public:announcements')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, payload => {
            callback(payload.new);
        })
        .subscribe();
        
    return () => supabase.removeChannel(channel);
};

export const sendAnnouncement = async (message, type) => {
    await supabase.from('announcements').insert({
        message,
        type,
        is_active: true
    });
};

// --- FEEDBACK ---

export const submitUserFeedback = async (userId, testType, rating, comments) => {
    await supabase.from('feedback').insert({
        user_id: userId,
        test_type: testType,
        rating,
        comments
    });
};

export const getAllFeedback = async () => {
    const { data } = await supabase.from('feedback').select('*, aspirants(full_name)').order('created_at', { ascending: false });
    return data || [];
};

export const deleteFeedback = async (id) => {
    await supabase.from('feedback').delete().eq('id', id);
};

// --- DAILY CHALLENGE ---

export const getLatestDailyChallenge = async () => {
  const { data } = await supabase
    .from('daily_challenges')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
};

export const uploadDailyChallenge = async (ppdtFile: File | null, wat: string, srt: string, interview: string) => {
  let ppdtUrl = null;
  if (ppdtFile) {
      const fileName = `daily-${Date.now()}-${ppdtFile.name}`;
      await supabase.storage.from('scenarios').upload(fileName, ppdtFile);
      const { data } = supabase.storage.from('scenarios').getPublicUrl(fileName);
      ppdtUrl = data.publicUrl;
  }
  
  await supabase.from('daily_challenges').insert({
      ppdt_image_url: ppdtUrl,
      wat_words: [wat],
      srt_situations: [srt],
      interview_question: interview
  });
};

export const submitDailyEntry = async (challengeId: string, ppdt: string, wat: string, srt: string, interview: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Login Required");
  
  await supabase.from('daily_submissions').insert({
      challenge_id: challengeId,
      user_id: user.id,
      ppdt_story: ppdt,
      wat_answers: [wat],
      srt_answers: [srt],
      interview_answer: interview
  });
};

export const getDailySubmissions = async (challengeId: string) => {
  // 1. Fetch submissions with author info
  const { data: submissions } = await supabase
    .from('daily_submissions')
    .select('*, aspirants(full_name, streak_count)')
    .eq('challenge_id', challengeId)
    .order('created_at', { ascending: false });

  // 2. Fetch current user's likes to determine isLiked status
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user && submissions && submissions.length > 0) {
      const { data: likes } = await supabase.from('submission_likes')
        .select('submission_id')
        .eq('user_id', user.id);
        
      const likedIds = new Set(likes?.map(l => l.submission_id));
      
      return submissions.map(s => ({
          ...s,
          isLiked: likedIds.has(s.id)
      }));
  }

  return submissions || [];
};

export const toggleLike = async (submissionId: string, userId: string) => {
  // 1. Check if the user already liked this submission
  const { data: existing } = await supabase.from('submission_likes')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('user_id', userId)
    .maybeSingle();

  // 2. Get current count to update UI accurately
  const { data: sub } = await supabase.from('daily_submissions').select('likes_count').eq('id', submissionId).single();
  const currentCount = sub?.likes_count || 0;

  if (existing) {
    // UNLIKE: Remove record and decrement count
    await supabase.from('submission_likes').delete().eq('id', existing.id);
    await supabase.from('daily_submissions').update({ likes_count: Math.max(0, currentCount - 1) }).eq('id', submissionId);
    return false; // Result is "Not Liked"
  } else {
    // LIKE: Insert record and increment count
    await supabase.from('submission_likes').insert({ submission_id: submissionId, user_id: userId });
    await supabase.from('daily_submissions').update({ likes_count: currentCount + 1 }).eq('id', submissionId);
    return true; // Result is "Liked"
  }
};
