
import { createClient } from '@supabase/supabase-js';
import { PIQData, UserSubscription, Announcement } from '../types';

// Initialize Supabase Client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- AUTHENTICATION ---

export const signInWithEmail = async (email: string, password: string) => {
  const auth = supabase.auth as any;
  // Handle v2
  if (auth.signInWithPassword) {
    return await auth.signInWithPassword({ email, password });
  }
  // Handle v1
  const { user, session, error } = await auth.signIn({ email, password });
  return { data: { user, session }, error };
};

export const signUpWithEmail = async (email: string, password: string, fullName: string) => {
  const auth = supabase.auth as any;
  // Attempt registration (hybrid support)
  let result;
  if (auth.signInWithPassword) {
      // v2
      result = await auth.signUp({ 
        email, 
        password,
        options: {
          data: { full_name: fullName }
        }
      });
  } else {
      // v1
      const { user, session, error } = await auth.signUp({ email, password }, { data: { full_name: fullName } });
      result = { data: { user, session }, error };
  }
  return result;
};

export const logoutUser = async () => {
  await (supabase.auth as any).signOut();
};

export const checkAuthSession = async () => {
  const auth = supabase.auth as any;
  if (auth.getSession) {
    const { data: { session } } = await auth.getSession();
    return session?.user || null;
  }
  // v1 fallback
  const session = auth.session ? auth.session() : null;
  return session?.user || null;
};

export const subscribeToAuthChanges = (callback: (user: any) => void) => {
  const auth = supabase.auth as any;
  const { data } = auth.onAuthStateChange((_event: any, session: any) => {
    callback(session?.user || null);
  });
  return () => {
      if (data?.unsubscribe) data.unsubscribe();
      if (data?.subscription?.unsubscribe) data.subscription.unsubscribe();
  };
};

export const isUserAdmin = (email: string | null | undefined) => {
  const adminEmails = ['rajveerrawat947@gmail.com', 'admin@ssbprep.online']; // Add your admin emails here
  return email ? adminEmails.includes(email) : false;
};

export const syncUserProfile = async (user: any) => {
  if (!user) return;
  
  // Ensure user profile exists in 'aspirants' table
  const { error } = await supabase
    .from('aspirants')
    .upsert({ 
        user_id: user.id, 
        email: user.email,
        full_name: user.user_metadata?.full_name,
        last_active: new Date().toISOString()
    }, { onConflict: 'user_id' });
    
  if (error) console.error("Sync Profile Error:", error);
  
  // Ensure subscription entry exists using UPSERT to prevent race conditions or missing rows
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('tier')
    .eq('user_id', user.id)
    .maybeSingle(); 
    
  if (!sub) {
      // NEW USER DEFAULT LIMITS
      const { error: subError } = await supabase.from('user_subscriptions').insert({
          user_id: user.id,
          tier: 'FREE',
          usage: {
            interview_used: 0, interview_limit: 1, 
            ppdt_used: 0, ppdt_limit: 10,          
            tat_used: 0, tat_limit: 2,             
            wat_used: 0, wat_limit: 3,             
            srt_used: 0, srt_limit: 3,             
            sdt_used: 0
          },
          extra_credits: { interview: 0 }
      });
      if (subError) console.warn("Sub Init Error (Table might be missing):", subError);
  }
};

// --- USER DATA ---

export const getUserData = async (userId: string): Promise<PIQData | null> => {
  const { data } = await supabase
    .from('aspirants')
    .select('piq_data')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.piq_data || null;
};

export const saveUserData = async (userId: string, data: PIQData) => {
  await supabase
    .from('aspirants')
    .update({ piq_data: data })
    .eq('user_id', userId);
};

export const getUserHistory = async (userId: string) => {
  const { data } = await supabase
    .from('test_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
    
  return data?.map((item: any) => ({
      id: item.id,
      type: item.test_type,
      timestamp: item.created_at,
      score: item.score,
      result: item.result_data
  })) || [];
};

export const getUserStreak = async (userId: string) => {
  const { data } = await supabase
    .from('aspirants')
    .select('streak_count')
    .eq('user_id', userId)
    .maybeSingle();
  return data || { streak_count: 0 };
};

export const saveTestAttempt = async (userId: string, testType: string, resultData: any) => {
  await supabase
    .from('test_history')
    .insert({
        user_id: userId,
        test_type: testType,
        score: resultData.score || 0,
        result_data: resultData
    });
};

export const getAllUsers = async () => {
  // 1. Fetch Aspirants Profile Data
  // Using select('*') to prevent "column not found" errors if schema drifts
  const { data: aspirants, error: aspError } = await supabase
    .from('aspirants')
    .select('*')
    .order('last_active', { ascending: false });

  if (aspError) {
    console.error("SSB Admin: Error fetching aspirants", aspError);
    return [];
  }

  // 2. Fetch All Subscriptions separately to ensure FRESH data
  const { data: subs, error: subError } = await supabase
    .from('user_subscriptions')
    .select('*');

  if (subError) {
    console.error("SSB Admin: Error fetching subscriptions", subError);
  }

  // 3. Manual Merge
  const mergedData = aspirants?.map((u: any) => {
      // Find matching subscription by user_id from the FRESH table
      const sub = subs?.find((s: any) => s.user_id === u.user_id);
      
      const defaultSub = { 
          tier: 'FREE', 
          usage: { 
            interview_used: 0, interview_limit: 1,
            ppdt_used: 0, ppdt_limit: 10,
            tat_used: 0, tat_limit: 2,
            wat_used: 0, wat_limit: 3,
            srt_used: 0, srt_limit: 3,
            sdt_used: 0 
          },
          extra_credits: { interview: 0 }
      };

      // Ensure we prioritize the live subscription table over any stale aspirant column
      return {
          ...u,
          subscription_data: sub || defaultSub
      };
  });
    
  return mergedData || [];
};

export const deleteUserProfile = async (userId: string) => {
    await supabase.from('test_history').delete().eq('user_id', userId);
    await supabase.from('user_subscriptions').delete().eq('user_id', userId);
    await supabase.from('payment_requests').delete().eq('user_id', userId);
    await supabase.from('user_feedback').delete().eq('user_id', userId); 
    await supabase.from('aspirants').delete().eq('user_id', userId);
};

// --- SUBSCRIPTION & PAYMENTS ---

export const getUserSubscription = async (userId: string): Promise<UserSubscription> => {
  let { data: sub, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) console.warn("Fetch Sub Error:", error.message);

  // 2. SELF-HEALING (PRO): If subscription is missing or FREE, check for valid payments
  if (!sub || sub.tier === 'FREE') {
      const { data: payment } = await supabase
          .from('payment_requests')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'APPROVED')
          .eq('plan_type', 'PRO_SUBSCRIPTION')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(); 

      if (payment) {
          console.log(`SSB: Auto-Repairing Subscription for ${userId} based on Payment ID: ${payment.id}`);
          
          try {
              const paymentDate = payment.created_at;
              const getUsageCount = async (testType: string) => {
                  const { count } = await supabase
                      .from('test_history')
                      .select('*', { count: 'exact', head: true })
                      .eq('user_id', userId)
                      .eq('test_type', testType)
                      .gt('created_at', paymentDate);
                  return count || 0;
              };

              const [interviewUsed, ppdtUsed, tatUsed, watUsed, srtUsed] = await Promise.all([
                  getUsageCount('INTERVIEW'),
                  getUsageCount('PPDT'),
                  getUsageCount('TAT'),
                  getUsageCount('WAT'),
                  getUsageCount('SRT')
              ]);

              const repairedSub = {
                  user_id: userId,
                  tier: 'PRO',
                  usage: {
                      interview_used: interviewUsed,
                      interview_limit: 5,
                      ppdt_used: ppdtUsed,
                      ppdt_limit: 30,
                      tat_used: tatUsed,
                      tat_limit: 7,
                      wat_used: watUsed,
                      wat_limit: 10,
                      srt_used: srtUsed,
                      srt_limit: 10,
                      sdt_used: 0 
                  },
                  extra_credits: sub?.extra_credits || { interview: 0 }
              };

              const { error: upsertError } = await supabase.from('user_subscriptions').upsert(repairedSub);
              if (!upsertError) {
                  // @ts-ignore
                  return repairedSub;
              } else {
                  console.error("Self-healing failed:", upsertError);
              }
          } catch(e) {
              console.error("Self-healing crashed", e);
          }
      }
  }

  // 3. MIGRATION FOR LEGACY FREE USERS
  if (sub && sub.tier === 'FREE') {
      const currentUsage = sub.usage;
      if (currentUsage.interview_limit < 1 || currentUsage.ppdt_limit < 10) {
          const newUsage = {
              ...currentUsage,
              interview_limit: Math.max(currentUsage.interview_limit, 1),
              ppdt_limit: Math.max(currentUsage.ppdt_limit, 10),
              tat_limit: Math.max(currentUsage.tat_limit, 2),
              wat_limit: Math.max(currentUsage.wat_limit, 3),
              srt_limit: Math.max(currentUsage.srt_limit, 3)
          };
          await supabase.from('user_subscriptions').update({ usage: newUsage }).eq('user_id', userId);
          sub.usage = newUsage;
      }
  }
    
  if (!sub) return {
      tier: 'FREE',
      expiryDate: null,
      usage: {
        interview_used: 0, interview_limit: 1, 
        ppdt_used: 0, ppdt_limit: 10,
        tat_used: 0, tat_limit: 2,
        wat_used: 0, wat_limit: 3,
        srt_used: 0, srt_limit: 3,
        sdt_used: 0
      },
      extra_credits: { interview: 0 }
  };
  
  return sub;
};

export const checkLimit = async (userId: string, testType: string) => {
  const sub = await getUserSubscription(userId);
  let allowed = false;
  let message = "Usage limit reached. Upgrade to Pro.";
  
  const usage = sub.usage;
  
  if (testType === 'INTERVIEW') {
      const total = usage.interview_limit + sub.extra_credits.interview;
      if (usage.interview_used < total) allowed = true;
      else message = "Interview credits exhausted. Purchase Top-up.";
  } else if (testType === 'PPDT') {
      if (usage.ppdt_used < usage.ppdt_limit) allowed = true;
  } else if (testType === 'TAT') {
      if (usage.tat_used < usage.tat_limit) allowed = true;
  } else if (testType === 'WAT') {
      if (usage.wat_used < usage.wat_limit) allowed = true;
  } else if (testType === 'SRT') {
      if (usage.srt_used < usage.srt_limit) allowed = true;
  }
  
  return { allowed, message };
};

export const incrementUsage = async (userId: string, testType: string) => {
  const sub = await getUserSubscription(userId);
  const usage = sub.usage;
  
  let update: any = {};
  
  if (testType === 'INTERVIEW') update = { 'usage': { ...usage, interview_used: usage.interview_used + 1 } };
  else if (testType === 'PPDT') update = { 'usage': { ...usage, ppdt_used: usage.ppdt_used + 1 } };
  else if (testType === 'TAT') update = { 'usage': { ...usage, tat_used: usage.tat_used + 1 } };
  else if (testType === 'WAT') update = { 'usage': { ...usage, wat_used: usage.wat_used + 1 } };
  else if (testType === 'SRT') update = { 'usage': { ...usage, srt_used: usage.srt_used + 1 } };
  
  if (testType === 'INTERVIEW' && usage.interview_used >= usage.interview_limit) {
      update = { 
          'usage': { ...usage, interview_used: usage.interview_used + 1 },
          'extra_credits': { ...sub.extra_credits, interview: Math.max(0, sub.extra_credits.interview - 1) } 
      };
  }

  if (Object.keys(update).length > 0) {
      await supabase
        .from('user_subscriptions')
        .update(update)
        .eq('user_id', userId);
  }
};

export const getLatestPaymentRequest = async (userId: string) => {
  const { data } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
};

export const getPendingPayments = async () => {
  const { data } = await supabase
    .from('payment_requests')
    .select('*, aspirants(full_name, email)')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });
  return data || [];
};

export const activatePlanForUser = async (userId: string, planType: string) => {
  let update: any = { user_id: userId };
  
  const defaultUsage = {
      interview_used: 0, interview_limit: 1,
      ppdt_used: 0, ppdt_limit: 10,
      tat_used: 0, tat_limit: 2,
      wat_used: 0, wat_limit: 3,
      srt_used: 0, srt_limit: 3,
      sdt_used: 0
  };

  if (planType === 'PRO_SUBSCRIPTION') {
      update = {
          ...update,
          tier: 'PRO',
          usage: {
            interview_used: 0, interview_limit: 5,
            ppdt_used: 0, ppdt_limit: 30,
            tat_used: 0, tat_limit: 7,
            wat_used: 0, wat_limit: 10,
            srt_used: 0, srt_limit: 10,
            sdt_used: 0
          },
          extra_credits: { interview: 0 } 
      };
      
      const { data: existing } = await supabase.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle();
      if (existing) {
          update.extra_credits = existing.extra_credits || { interview: 0 };
      }
      
  } else if (planType === 'INTERVIEW_ADDON') {
      const { data: current } = await supabase.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle();
      
      const currentExtras = current?.extra_credits?.interview || 0;
      const currentUsage = current?.usage || defaultUsage;
      const currentTier = current?.tier || 'FREE';

      update = {
          ...update,
          tier: currentTier,
          usage: currentUsage,
          extra_credits: { interview: currentExtras + 1 }
      };
  }
  
  const { error: subError } = await supabase.from('user_subscriptions').upsert(update);
  if (subError) throw subError;
};

export const approvePaymentRequest = async (id: string, userId: string, planType: string) => {
  const { error: payError } = await supabase.from('payment_requests').update({ status: 'APPROVED' }).eq('id', id);
  if (payError) throw payError;
  await activatePlanForUser(userId, planType);
};

export const rejectPaymentRequest = async (id: string) => {
  await supabase.from('payment_requests').update({ status: 'REJECTED' }).eq('id', id);
};

export const processRazorpayTransaction = async (userId: string, paymentId: string, amount: number, planType: string, couponCode?: string) => {
    const { data, error } = await supabase.from('payment_requests').insert({
        user_id: userId,
        utr: paymentId,
        amount: amount,
        plan_type: planType,
        status: 'APPROVED', 
        coupon_code: couponCode
    }).select().single();
    
    if (error) {
        console.error("Payment Record Insert Failed", error);
        throw new Error("Could not record payment. Database Error.");
    }
    
    await activatePlanForUser(userId, planType);
    
    if (couponCode) {
        const { data: coupon } = await supabase.from('coupons').select('usage_count').eq('code', couponCode).maybeSingle();
        if (coupon) {
            await supabase.from('coupons').update({ usage_count: (coupon.usage_count || 0) + 1 }).eq('code', couponCode);
        }
    }
};

// --- CONTENT MANAGEMENT ---

export const getPPDTScenarios = async () => {
  const { data } = await supabase.from('ppdt_scenarios').select('*');
  return data || [];
};

export const uploadPPDTScenario = async (file: File, description: string) => {
  const fileName = `ppdt-${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage.from('scenarios').upload(fileName, file);
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage.from('scenarios').getPublicUrl(fileName);
  
  await supabase.from('ppdt_scenarios').insert({
      image_url: publicUrl,
      description
  });
};

export const deletePPDTScenario = async (id: string, url: string) => {
  const fileName = url.split('/').pop();
  if (fileName) await supabase.storage.from('scenarios').remove([fileName]);
  await supabase.from('ppdt_scenarios').delete().eq('id', id);
};

export const getTATScenarios = async () => {
  const { data } = await supabase.from('tat_scenarios').select('*').order('set_tag');
  return data || [];
};

export const uploadTATScenario = async (file: File, description: string, setTag: string) => {
  const fileName = `tat-${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from('scenarios').upload(fileName, file);
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage.from('scenarios').getPublicUrl(fileName);
  
  await supabase.from('tat_scenarios').insert({
      image_url: publicUrl,
      description,
      set_tag: setTag
  });
};

export const deleteTATScenario = async (id: string, url: string) => {
  const fileName = url.split('/').pop();
  if (fileName) await supabase.storage.from('scenarios').remove([fileName]);
  await supabase.from('tat_scenarios').delete().eq('id', id);
};

export const getWATWords = async () => {
  const { data } = await supabase.from('wat_words').select('*').order('set_tag');
  return data || [];
};

export const uploadWATWords = async (words: string[], setTag: string) => {
  const payload = words.map(w => ({ word: w, set_tag: setTag }));
  await supabase.from('wat_words').insert(payload);
};

export const deleteWATWord = async (id: string) => {
  await supabase.from('wat_words').delete().eq('id', id);
};

export const deleteWATSet = async (tag: string) => {
  await supabase.from('wat_words').delete().eq('set_tag', tag);
};

export const getSRTQuestions = async () => {
  const { data } = await supabase.from('srt_questions').select('*').order('set_tag');
  return data || [];
};

export const uploadSRTQuestions = async (questions: string[], setTag: string) => {
  const payload = questions.map(q => ({ question: q, set_tag: setTag }));
  await supabase.from('srt_questions').insert(payload);
};

export const deleteSRTQuestion = async (id: string) => {
  await supabase.from('srt_questions').delete().eq('id', id);
};

export const deleteSRTSet = async (tag: string) => {
  await supabase.from('srt_questions').delete().eq('set_tag', tag);
};

export const getCoupons = async () => {
  const { data } = await supabase.from('coupons').select('*');
  return data || [];
};

export const createCoupon = async (code: string, discount: number, influencer: string) => {
  await supabase.from('coupons').insert({
      code: code.toUpperCase(),
      discount_percent: discount,
      influencer_name: influencer,
      usage_count: 0 // Initialize explicitly
  });
};

export const deleteCoupon = async (code: string) => {
  await supabase.from('coupons').delete().eq('code', code);
};

export const validateCoupon = async (code: string) => {
  const { data } = await supabase.from('coupons').select('*').eq('code', code.toUpperCase()).maybeSingle();
  if (!data) return { valid: false, message: 'Invalid Code' };
  return { valid: true, discount: data.discount_percent, message: `Success! ${data.discount_percent}% OFF applied.` };
};

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
  const auth = supabase.auth as any;
  const user = auth.user ? auth.user() : (await auth.getUser()).data.user;
  
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
  const { data } = await supabase
    .from('daily_submissions')
    .select('*, aspirants(full_name)')
    .eq('challenge_id', challengeId)
    .order('created_at', { ascending: false });
  return data || [];
};

export const toggleLike = async (submissionId: string) => {
  const { data: sub } = await supabase.from('daily_submissions').select('likes_count').eq('id', submissionId).single();
  if (sub) {
      await supabase.from('daily_submissions').update({ likes_count: (sub.likes_count || 0) + 1 }).eq('id', submissionId);
  }
};

export const getRecentAnnouncements = async (): Promise<Announcement[]> => {
  const { data } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(5);
  return data || [];
};

export const subscribeToAnnouncements = (callback: (a: Announcement) => void) => {
  const channel = supabase
    .channel('public:announcements')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, payload => {
        callback(payload.new as Announcement);
    })
    .subscribe();
    
  return () => { supabase.removeChannel(channel); };
};

export const sendAnnouncement = async (message: string, type: 'INFO' | 'WARNING' | 'SUCCESS' | 'URGENT') => {
  await supabase.from('announcements').insert({
      message,
      type,
      is_active: true
  });
};

export const submitUserFeedback = async (userId: string, testType: string, rating: number, comments: string) => {
  await supabase.from('user_feedback').insert({
      user_id: userId,
      test_type: testType,
      rating: rating,
      comments: comments
  });
};

export const getAllFeedback = async () => {
  const { data } = await supabase
    .from('user_feedback')
    .select('*, aspirants(full_name, email)')
    .order('created_at', { ascending: false });
  return data || [];
};

export const deleteFeedback = async (id: string) => {
  await supabase.from('user_feedback').delete().eq('id', id);
};
