
import { createClient } from '@supabase/supabase-js';
import { PIQData, UserSubscription, Announcement } from '../types';

// Initialize Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY || process.env.REACT_APP_SUPABASE_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- COIN RATES CONFIGURATION ---
export const TEST_RATES = {
    PPDT: 5,
    SRT: 5,
    WAT: 5,
    LECTURETTE: 3, 
    SDT: 5,
    TAT: 10,
    GPE: 10,
    OIR: 10, 
    OIR_SUDDEN_DEATH: 5, 
    INTERVIEW_TRIAL: 20, 
    INTERVIEW_FULL: 100,
    MOCK_SCREENING: 0
};


export const getScreeningConfig = async () => {
  const { data } = await supabase
    .from('daily_cache')
    .select('content')
    .eq('category', 'SCREENING_CONFIG')
    .eq('date_key', 'LATEST')
    .maybeSingle();
  return data?.content || null;
};

export const updateScreeningConfig = async (config: { oir1_id: string, oir2_id: string, ppdt_id: string }) => {
  await supabase.from('daily_cache').upsert({
    category: 'SCREENING_CONFIG',
    date_key: 'LATEST',
    content: config
  }, { onConflict: 'category,date_key' });
};

export const getGPEScenarios = async () => {
  const { data } = await supabase.from('gpe_scenarios').select('*').order('created_at', { ascending: false });
  return data || [];
};

export const addGPEScenario = async (title: string, narrative: string, imageUrl: string, difficulty: string) => {
  const { data, error } = await supabase.from('gpe_scenarios').insert({
    title,
    narrative,
    image_url: imageUrl,
    difficulty
  }).select().single();
  if (error) throw error;
  return data;
};

export const deleteGPEScenario = async (id: string) => {
  await supabase.from('gpe_scenarios').delete().eq('id', id);
};

export const getOIRSets = async () => {
  const { data } = await supabase.from('oir_sets').select('*').order('created_at', { ascending: false });
  return data || [];
};

export const createOIRSet = async (title: string, timeLimit: number) => {
  const { data, error } = await supabase.from('oir_sets').insert({ title, time_limit_seconds: timeLimit }).select().single();
  if (error) throw error;
  return data;
};

export const deleteOIRSet = async (setId: string) => {
  await supabase.from('oir_sets').delete().eq('id', setId);
};

export const getOIRQuestions = async (setId: string) => {
  const { data } = await supabase.from('oir_questions').select('*').eq('set_id', setId).order('created_at', { ascending: true });
  return data || [];
};

export const getAllOIRQuestionsRandom = async (limit: number = 50) => {
  const { data } = await supabase.from('oir_questions').select('*').limit(100);
  if (!data) return [];
  return data.sort(() => Math.random() - 0.5).slice(0, limit);
};

export const getOIRLeaderboard = async (type: 'STANDARD' | 'SUDDEN_DEATH' = 'STANDARD', setId?: string) => {
  const dbTestType = type === 'SUDDEN_DEATH' ? 'OIR_SUDDEN_DEATH' : 'OIR';
  
  let query = supabase
    .from('test_history')
    .select('score, created_at, result_data, aspirants(full_name, user_id)')
    .eq('test_type', dbTestType)
    .order('score', { ascending: false })
    .limit(50);

  if (type === 'STANDARD' && setId) {
      query = query.contains('result_data', { setId: setId });
  }

  const { data, error } = await query;

  if (error) {
      console.error("Leaderboard fetch error:", error);
      return [];
  }
  
  return data.map((entry: any) => ({
      name: entry.aspirants?.full_name || 'Unknown Cadet',
      score: entry.score,
      date: entry.created_at,
      oirRating: entry.result_data?.oir || 5,
      completed: entry.result_data?.completed, 
      setId: entry.result_data?.setId
  }));
};

export const addOIRQuestion = async (setId: string, text: string, imageUrl: string | null, options: string[], correctIndex: number) => {
  await supabase.from('oir_questions').insert({
    set_id: setId,
    question_text: text,
    image_url: imageUrl,
    options,
    correct_index: correctIndex
  });
};

export const deleteOIRQuestion = async (id: string) => {
  await supabase.from('oir_questions').delete().eq('id', id);
};

export const getOIRDoubts = async (questionId: string) => {
  const { data } = await supabase.from('oir_doubts').select('*').eq('question_id', questionId).order('created_at', { ascending: false });
  return data || [];
};

export const postOIRDoubt = async (questionId: string, userId: string, userName: string, comment: string) => {
  await supabase.from('oir_doubts').insert({
    question_id: questionId,
    user_id: userId,
    user_name: userName,
    comment
  });
};


export const getCachedContent = async (category: string, dateKey: string) => {
  const { data } = await supabase
    .from('daily_cache')
    .select('content')
    .eq('category', category)
    .eq('date_key', dateKey)
    .maybeSingle();
  
  return data?.content || null;
};

export const setCachedContent = async (category: string, dateKey: string, content: any) => {
  const { error } = await supabase.from('daily_cache').upsert({
      category,
      date_key: dateKey,
      content
  }, { onConflict: 'category,date_key' });
  
  if (error) console.error("Cache Write Error:", error);
};


export const getLecturetteContent = async (topic: string) => {
  const { data } = await supabase
    .from('lecturette_topics')
    .select('content')
    .eq('topic', topic)
    .maybeSingle();
  return data?.content || null;
};

export const saveLecturetteContent = async (topic: string, board: string, category: string, content: any) => {
  const { error } = await supabase
    .from('lecturette_topics')
    .upsert({
      topic,
      board,
      category,
      content
    }, { onConflict: 'topic' });
    
  if (error) console.error("Error saving lecturette cache:", error);
};


export const getTickerConfig = async () => {
  const { data } = await supabase
    .from('ticker_config')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || { message: '', is_active: false, speed: 25 };
};

export const updateTickerConfig = async (message: string, is_active: boolean, speed: number) => {
  await supabase.from('ticker_config').insert({
      message,
      is_active,
      speed
  });
};

export const subscribeToTicker = (callback: (config: any) => void) => {
  const channel = supabase
    .channel('public:ticker_config')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticker_config' }, payload => {
        callback(payload.new);
    })
    .subscribe();
    
  return () => { supabase.removeChannel(channel); };
};


export const signInWithEmail = async (email: string, password: string) => {
  const auth = supabase.auth as any;
  if (auth.signInWithPassword) {
    return await auth.signInWithPassword({ email, password });
  }
  const { user, session, error } = await auth.signIn({ email, password });
  return { data: { user, session }, error };
};

export const signInWithGoogle = async () => {
  const auth = supabase.auth as any;
  return await auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
};

export const signUpWithEmail = async (email: string, password: string, fullName: string) => {
  const auth = supabase.auth as any;
  let result;
  if (auth.signInWithPassword) {
      result = await auth.signUp({ 
        email, 
        password,
        options: {
          data: { 
            full_name: fullName 
          }
        }
      });
  } else {
      const { user, session, error } = await auth.signUp({ email, password }, { data: { full_name: fullName } });
      result = { data: { user, session }, error };
  }
  return result;
};

export const logoutUser = async () => {
  await (supabase.auth as any).signOut();
};

export const resendConfirmationEmail = async (email: string) => {
  const auth = supabase.auth as any;
  if (auth.resend) {
    return await auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });
  }
  // Fallback for older supabase versions if any
  return { error: new Error("Resend not supported on this client version") };
};

export const checkAuthSession = async () => {
  const auth = supabase.auth as any;
  if (auth.getSession) {
    const { data: { session } } = await auth.getSession();
    return session?.user || null;
  }
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
  const adminEmails = ['rajveerrawat947@gmail.com', 'admin@ssbprep.online']; 
  return email ? adminEmails.includes(email) : false;
};

export const syncUserProfile = async (user: any) => {
  if (!user) return;
  
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || 'Cadet';

  // Ensure user profile exists
  const { error } = await supabase
    .from('aspirants')
    .upsert({ 
        user_id: user.id, 
        email: user.email,
        full_name: fullName,
        last_active: new Date().toISOString()
    }, { onConflict: 'user_id' });
    
  if (error) console.error("Sync Profile Error:", error);
  
  // Ensure subscription entry exists
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('tier')
    .eq('user_id', user.id)
    .maybeSingle(); 
    
  if (!sub) {
      const { error: subError } = await supabase.from('user_subscriptions').insert({
          user_id: user.id,
          tier: 'FREE',
          coins: 50, 
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
      if (subError) console.warn("Sub Init Error:", subError);
  }
};


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
  if (!userId) {
    console.warn("getUserHistory called without userId");
    return [];
  }
  
  console.log("Fetching history for userId:", userId);
  
  try {
    // Fetch metadata only to avoid timeouts from large JSON blobs
    // We extract the status from the JSON column directly in the query
    const { data, error } = await supabase
      .from('test_history')
      .select('id, test_type, created_at, score, status:result_data->>_status')
      .eq('user_id', userId)
      .neq('test_type', 'CHALLENGE_14_DAY_PROGRESS')
      .order('created_at', { ascending: false })
      .limit(300);
      
    if (error) {
      console.error("Supabase error fetching history:", JSON.stringify(error));
      return [];
    }
    
    console.log(`Successfully fetched ${data?.length || 0} history records (metadata only)`);
      
    return data?.map((item: any) => ({
        id: item.id,
        type: item.test_type,
        timestamp: item.created_at,
        score: item.score,
        result: null, // We'll fetch this on demand using getTestReport
        status: item.status || 'completed'
    })) || [];
  } catch (err) {
    console.error("Unexpected error in getUserHistory:", err);
    return [];
  }
};

export const getTestReport = async (reportId: string) => {
    try {
        const { data, error } = await supabase
            .from('test_history')
            .select('result_data')
            .eq('id', reportId)
            .single();
            
        if (error) {
            console.error("Error fetching test report:", error);
            return null;
        }
        
        let resultData = data.result_data;
        if (typeof resultData === 'string') {
            try {
                resultData = JSON.parse(resultData);
            } catch (e) {
                console.error("Error parsing result_data for report", reportId);
            }
        }
        return resultData;
    } catch (err) {
        console.error("Unexpected error in getTestReport:", err);
        return null;
    }
};

export const getUserStreak = async (userId: string) => {
  const { data } = await supabase
    .from('aspirants')
    .select('streak_count')
    .eq('user_id', userId)
    .maybeSingle();
  return data || { streak_count: 0 };
};

export const saveTestAttempt = async (userId: string, testType: string, resultData: any, status: 'pending' | 'completed' = 'completed', originalData: any = null) => {
  const { data, error } = await supabase
    .from('test_history')
    .insert({
        user_id: userId,
        test_type: testType,
        score: resultData.score || 0,
        result_data: {
            ...resultData,
            _status: status,
            _original_data: originalData
        }
    })
    .select()
    .single();
    
    if (error) {
        console.error("Error saving test attempt:", error);
        return null;
    }

    // --- ALSO SAVE TO NEW ASSESSMENT TABLES ---
    try {
        if (status === 'pending') {
            await saveNewPendingAssessment(userId, testType, originalData);
        } else {
            await saveNewCompletedAssessment(userId, testType, resultData.score || 0, resultData, resultData.feedback, 'completed');
        }
    } catch (newTableError) {
        console.error("Error saving to new assessment tables:", newTableError);
    }
    
    return data;
};

// ** NEW: Update existing test record with new analysis **
export const updateTestAttempt = async (id: string, resultData: any, status: 'completed' | 'failed' = 'completed') => {
    // Check if it's already completed to prevent race conditions
    const { data: currentHistory } = await supabase
        .from('test_history')
        .select('result_data')
        .eq('id', id)
        .single();
        
    if (currentHistory && currentHistory.result_data?._status === 'completed' && status === 'completed') {
        console.log(`[updateTestAttempt] Assessment ${id} is already completed. Skipping update to prevent duplicates.`);
        return;
    }

    // 1. Update legacy test_history
    const { data: updatedHistory, error } = await supabase
      .from('test_history')
      .update({
          score: resultData.score || 0,
          result_data: {
              ...resultData,
              _status: status
          }
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
        console.error("Error updating test attempt:", error);
        return;
    }

    // 2. Update NEW completed_assessments table
    // Since we don't have a direct link between IDs, we'll just insert a new completed record
    // if the status is completed. This ensures it shows up in the Assessment Center.
    if (status === 'completed' && updatedHistory) {
        try {
            await saveNewCompletedAssessment(
                updatedHistory.user_id, 
                updatedHistory.test_type, 
                resultData.score || 0, 
                resultData, 
                resultData.feedback, 
                'completed'
            );
            
            // Optional: Try to find and delete from pending_assessments if it exists
            // We can try to match by user_id and test_type (most recent)
            const { data: pending } = await supabase
                .from('pending_assessments')
                .select('id')
                .eq('user_id', updatedHistory.user_id)
                .eq('test_type', updatedHistory.test_type)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (pending) {
                await deleteNewPendingAssessment(pending.id);
            }
        } catch (newTableError) {
            console.error("Error updating new assessment tables:", newTableError);
        }
    }
};

export const getPendingAssessments = async (userId: string) => {
    // Only fetch assessments older than 5 minutes to prevent race conditions
    // with active evaluations happening in the UI
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
        .from('test_history')
        .select('*')
        .eq('user_id', userId)
        .eq('result_data->>_status', 'pending')
        .lt('created_at', fiveMinutesAgo);
    
    if (error) {
        console.error("Error fetching pending assessments:", error);
        return [];
    }
    
    return data.map(item => ({
        ...item,
        status: item.result_data?._status || 'completed',
        original_data: item.result_data?._original_data || null
    }));
};

export const getAllUsers = async () => {
  const { data: aspirants, error: aspError } = await supabase
    .from('aspirants')
    .select('*')
    .order('last_active', { ascending: false });

  if (aspError) return [];

  const { data: subs } = await supabase
    .from('user_subscriptions')
    .select('*');

  const { data: history } = await supabase
    .from('test_history')
    .select('user_id, test_type, created_at, score')
    .neq('test_type', 'CHALLENGE_14_DAY_PROGRESS')
    .order('created_at', { ascending: false });

  const mergedData = aspirants?.map((u: any) => {
      const sub = subs?.find((s: any) => s.user_id === u.user_id);
      const userHistory = history?.filter((h: any) => h.user_id === u.user_id) || [];
      
      return {
          ...u,
          subscription_data: sub || { tier: 'FREE', coins: 0, usage: {} },
          test_history: userHistory
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

export const getUserSubscription = async (userId: string): Promise<UserSubscription> => {
  let { data: sub, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) console.warn("Fetch Sub Error:", error.message);
    
  if (!sub) return {
      tier: 'FREE',
      coins: 0,
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
  
  if (sub.coins === undefined || sub.coins === null) {
      sub.coins = 50; 
  }
  
  return sub;
};

export const checkBalance = async (userId: string, cost: number) => {
    const sub = await getUserSubscription(userId);
    if (sub.coins >= cost) {
        return { allowed: true, balance: sub.coins };
    }
    return { allowed: false, balance: sub.coins, shortfall: cost - sub.coins };
};

export const deductCoins = async (userId: string, amount: number) => {
    const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('coins')
        .eq('user_id', userId)
        .single();
        
    if (!sub || sub.coins < amount) return false;
    
    const newBalance = sub.coins - amount;
    
    const { error } = await supabase
        .from('user_subscriptions')
        .update({ coins: newBalance })
        .eq('user_id', userId);
        
    if (error) {
        console.error("Deduction failed:", error);
        return false;
    }
    return true;
};

export const creditCoins = async (userId: string, amount: number) => {
    const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('coins')
        .eq('user_id', userId)
        .single();
        
    const currentCoins = sub?.coins || 0;
    
    const { error } = await supabase
        .from('user_subscriptions')
        .update({ coins: currentCoins + amount })
        .eq('user_id', userId);
        
    if (error) {
        console.error("Credit failed:", error);
        return false;
    }
    return true;
};

export const checkLimit = async (userId: string, testType: string) => {
  return { allowed: true, message: "" };
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

export const activatePlanForUser = async (userId: string, planType: string, amount?: number, coinsCredit?: number) => {
  const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('coins')
      .eq('user_id', userId)
      .single();
      
  const currentCoins = sub?.coins || 0;
  let coinsToAdd = 0;

  if (coinsCredit !== undefined) {
      coinsToAdd = coinsCredit;
  } else {
      coinsToAdd = amount || 0;
      if (planType === 'COIN_PACK' || planType === 'PRO_SUBSCRIPTION' || planType === 'INTERVIEW_ADDON') {
          if (amount === 100) coinsToAdd = 110;
          else if (amount === 200) coinsToAdd = 230;
          else if (amount === 300) coinsToAdd = 350;
      }
  }
  
  const { error } = await supabase
      .from('user_subscriptions')
      .update({ coins: currentCoins + coinsToAdd })
      .eq('user_id', userId);
      
  if (error) throw error;
};

export const approvePaymentRequest = async (id: string, userId: string, planType: string) => {
  const { data: req } = await supabase.from('payment_requests').select('amount').eq('id', id).single();
  const amount = req?.amount || 0;

  const { error: payError } = await supabase.from('payment_requests').update({ status: 'APPROVED' }).eq('id', id);
  if (payError) throw payError;
  
  await activatePlanForUser(userId, planType, amount);
};

export const rejectPaymentRequest = async (id: string) => {
  await supabase.from('payment_requests').update({ status: 'REJECTED' }).eq('id', id);
};

export const getPPDTScenarios = async () => { const { data } = await supabase.from('ppdt_scenarios').select('*'); return data || []; };
export const uploadCustomScenario = async (file: File) => {
  const fileName = `custom-${Date.now()}-${file.name}`;
  await supabase.storage.from('scenarios').upload(fileName, file);
  const { data: { publicUrl } } = supabase.storage.from('scenarios').getPublicUrl(fileName);
  return publicUrl;
};

export const uploadPPDTScenario = async (file: File, description: string) => { const fileName = `ppdt-${Date.now()}-${file.name}`; await supabase.storage.from('scenarios').upload(fileName, file); const { data: { publicUrl } } = supabase.storage.from('scenarios').getPublicUrl(fileName); await supabase.from('ppdt_scenarios').insert({ image_url: publicUrl, description }); };
export const deletePPDTScenario = async (id: string, url: string) => { const fileName = url.split('/').pop(); if (fileName) await supabase.storage.from('scenarios').remove([fileName]); await supabase.from('ppdt_scenarios').delete().eq('id', id); };
export const getTATScenarios = async () => { const { data } = await supabase.from('tat_scenarios').select('*').order('set_tag'); return data || []; };
export const uploadTATScenario = async (file: File, description: string, setTag: string) => { const fileName = `tat-${Date.now()}-${file.name}`; await supabase.storage.from('scenarios').upload(fileName, file); const { data: { publicUrl } } = supabase.storage.from('scenarios').getPublicUrl(fileName); await supabase.from('tat_scenarios').insert({ image_url: publicUrl, description, set_tag: setTag }); };
export const deleteTATScenario = async (id: string, url: string) => { const fileName = url.split('/').pop(); if (fileName) await supabase.storage.from('scenarios').remove([fileName]); await supabase.from('tat_scenarios').delete().eq('id', id); };
export const getWATWords = async () => { const { data } = await supabase.from('wat_words').select('*').order('set_tag'); return data || []; };
export const uploadWATWords = async (words: string[], setTag: string) => { const payload = words.map(w => ({ word: w, set_tag: setTag })); await supabase.from('wat_words').insert(payload); };
export const deleteWATWord = async (id: string) => { await supabase.from('wat_words').delete().eq('id', id); };
export const deleteWATSet = async (tag: string) => { await supabase.from('wat_words').delete().eq('set_tag', tag); };
export const getSRTQuestions = async () => { const { data } = await supabase.from('srt_questions').select('*').order('set_tag'); return data || []; };
export const uploadSRTQuestions = async (questions: string[], setTag: string) => { const payload = questions.map(q => ({ question: q, set_tag: setTag })); await supabase.from('srt_questions').insert(payload); };
export const deleteSRTQuestion = async (id: string) => { await supabase.from('srt_questions').delete().eq('id', id); };
export const deleteSRTSet = async (tag: string) => { await supabase.from('srt_questions').delete().eq('set_tag', tag); };
export const getCoupons = async () => { const { data } = await supabase.from('coupons').select('*'); return data || []; };
export const createCoupon = async (code: string, discount: number, influencer: string) => { await supabase.from('coupons').insert({ code: code.toUpperCase(), discount_percent: discount, influencer_name: influencer, usage_count: 0 }); };
export const deleteCoupon = async (code: string) => { await supabase.from('coupons').delete().eq('code', code); };
export const validateCoupon = async (code: string) => { const { data } = await supabase.from('coupons').select('*').eq('code', code.toUpperCase()).maybeSingle(); if (!data) return { valid: false, message: 'Invalid Code' }; return { valid: true, discount: data.discount_percent, message: `Success! ${data.discount_percent}% OFF applied.` }; };
export const getLatestDailyChallenge = async () => { const { data } = await supabase.from('daily_challenges').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(); return data; };

export const uploadDailyChallenge = async (oirFile: File | null, oirText: string, wat: string, srt: string, interview: string, oirCorrectAnswer?: string, oirExplanation?: string) => {
  let oirUrl = null;
  if (oirFile) {
    const fileName = `daily-oir-${Date.now()}-${oirFile.name}`;
    await supabase.storage.from('scenarios').upload(fileName, oirFile);
    const { data } = supabase.storage.from('scenarios').getPublicUrl(fileName);
    oirUrl = data.publicUrl;
  }
  await supabase.from('daily_challenges').insert({
      ppdt_image_url: oirUrl,
      oir_text: oirText,
      wat_words: [wat],
      srt_situations: [srt],
      interview_question: interview,
      oir_correct_answer: oirCorrectAnswer,
      oir_explanation: oirExplanation
  });
};

export const submitDailyEntry = async (challengeId: string, oirAnswer: string, wat: string, srt: string, interview: string, aiEvaluation?: any) => {
  const auth = supabase.auth as any;
  const user = auth.user ? auth.user() : (await auth.getUser()).data.user;
  if (!user) throw new Error("Login Required");

  // Check if user already submitted for this challenge
  const { data: existingSub } = await supabase
    .from('daily_submissions')
    .select('id')
    .eq('challenge_id', challengeId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingSub) throw new Error("Already submitted for this challenge");

  // Check if user already submitted ANY challenge today for the daily reward
  const today = new Date().toISOString().split('T')[0];
  const { data: existingToday } = await supabase
    .from('daily_submissions')
    .select('id')
    .eq('user_id', user.id)
    .gte('created_at', `${today}T00:00:00Z`)
    .lte('created_at', `${today}T23:59:59Z`)
    .maybeSingle();

  const { error } = await supabase.from('daily_submissions').insert({
      challenge_id: challengeId,
      user_id: user.id,
      ppdt_story: oirAnswer,
      wat_answers: [wat],
      srt_answers: [srt],
      interview_answer: interview,
      ai_evaluation: aiEvaluation
  });

  if (error) throw error;

  // If this is the first submission of the day, credit 2 coins
  if (!existingToday) {
      await creditCoins(user.id, 2);
      return { rewarded: true };
  }

  return { rewarded: false };
};

export const updateDailySubmissionAI = async (submissionId: string, aiEvaluation: any) => {
  const { error } = await supabase
    .from('daily_submissions')
    .update({ ai_evaluation: aiEvaluation })
    .eq('id', submissionId);
  
  if (error) throw error;
};

export const hasUserSubmittedDaily = async (userId: string, challengeId: string) => {
  const { data, error } = await supabase
    .from('daily_submissions')
    .select('id')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
};

export const getDailySubmissions = async (challengeId: string) => {
  const { data: submissions, error: subError } = await supabase
    .from('daily_submissions')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('created_at', { ascending: false });

  if (subError || !submissions || submissions.length === 0) return [];

  const userIds = [...new Set(submissions.map(r => r.user_id))];
  
  const [{ data: profiles }] = await Promise.all([
      supabase.from('aspirants').select('user_id, full_name, streak_count').in('user_id', userIds)
  ]);
      
  return submissions.map(sub => {
      const profile = profiles?.find(p => p.user_id === sub.user_id);
      return {
          ...sub,
          aspirants: profile || { 
              full_name: 'Cadet', 
              streak_count: 0 
          }
      };
  });
};

export const toggleLike = async (submissionId: string, isLike: boolean) => {
    const { data: sub } = await supabase.from('daily_submissions').select('likes_count').eq('id', submissionId).single();
    if (sub) {
        let newCount = (sub.likes_count || 0) + (isLike ? 1 : -1);
        if (newCount < 0) newCount = 0;
        await supabase.from('daily_submissions').update({ likes_count: newCount }).eq('id', submissionId);
    }
};

export const getRecentAnnouncements = async (): Promise<Announcement[]> => { const { data } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5); return data || []; };
export const subscribeToAnnouncements = (callback: (a: Announcement) => void) => { const channel = supabase.channel('public:announcements').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, payload => { callback(payload.new as Announcement); }).subscribe(); return () => { supabase.removeChannel(channel); }; };
export const sendAnnouncement = async (message: string, type: 'INFO' | 'WARNING' | 'SUCCESS' | 'URGENT') => { await supabase.from('announcements').insert({ message, type, is_active: true }); };
export const submitUserFeedback = async (userId: string, testType: string, rating: number, comments: string) => { await supabase.from('user_feedback').insert({ user_id: userId, test_type: testType, rating: rating, comments: comments }); };

export const getAllFeedback = async () => {
  const { data, error } = await supabase
    .from('user_feedback')
    .select('*, aspirants(full_name, email)')
    .order('created_at', { ascending: false });

  if (!error && data) return data;

  const { data: rawData } = await supabase
    .from('user_feedback')
    .select('*')
    .order('created_at', { ascending: false });

  return rawData || [];
};

export const deleteFeedback = async (id: string) => { await supabase.from('user_feedback').delete().eq('id', id); };

// --- NEW ASSESSMENT SECTION FUNCTIONS ---
export const getNewPendingAssessments = async (userId: string) => {
    const { data, error } = await supabase
        .from('pending_assessments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error("Error fetching new pending assessments:", error);
        return [];
    }
    return data;
};

export const getNewCompletedAssessments = async (userId: string) => {
    const { data, error } = await supabase
        .from('completed_assessments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error("Error fetching new completed assessments:", error);
        return [];
    }
    return data;
};

export const saveNewPendingAssessment = async (userId: string, testType: string, originalData: any) => {
    const { data, error } = await supabase
        .from('pending_assessments')
        .insert({
            user_id: userId,
            test_type: testType,
            original_data: originalData
        })
        .select()
        .single();
    
    if (error) console.error("Error saving new pending assessment:", error);
    return data;
};

export const saveNewCompletedAssessment = async (userId: string, testType: string, score: number, resultData: any, feedback?: string, status: 'completed' | 'processing' | 'failed' = 'completed') => {
    const { data, error } = await supabase
        .from('completed_assessments')
        .insert({
            user_id: userId,
            test_type: testType,
            score,
            result_data: resultData,
            feedback,
            status
        })
        .select()
        .single();
    
    if (error) console.error("Error saving new completed assessment:", error);
    return data;
};

export const updateNewCompletedAssessment = async (id: string, score: number, resultData: any, feedback?: string, status: 'completed' | 'failed' = 'completed') => {
    const { error } = await supabase
        .from('completed_assessments')
        .update({
            score,
            result_data: resultData,
            feedback,
            status
        })
        .eq('id', id);
    
    if (error) console.error("Error updating new completed assessment:", error);
};

export const deleteNewPendingAssessment = async (id: string) => {
    const { error } = await supabase
        .from('pending_assessments')
        .delete()
        .eq('id', id);
    
    if (error) console.error("Error deleting new pending assessment:", error);
};

// --- MENTOR FUNCTIONS ---

export const getMentorProfile = async (userId: string) => {
    const { data, error } = await supabase
        .from('mentors')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
    
    if (error) console.error("Error fetching mentor profile:", error);
    return data;
};

export const requestMentorApproval = async (userId: string, fullName: string, email: string, bio: string, specialization: string) => {
    const { data, error } = await supabase
        .from('mentors')
        .upsert({
            id: userId,
            full_name: fullName,
            email: email,
            bio: bio,
            specialization: specialization,
            status: 'PENDING' // Always reset to PENDING on update/request
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const getAllMentors = async () => {
    const { data, error } = await supabase
        .from('mentors')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) console.error("Error fetching all mentors:", error);
    return data || [];
};

export const approveMentor = async (mentorId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => {
    const { error } = await supabase
        .from('mentors')
        .update({ status: status })
        .eq('id', mentorId);
    
    if (error) throw error;
};

export const createBatch = async (mentorId: string, name: string, description: string) => {
    // Generate a unique 6-character batch code
    const batchCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data, error } = await supabase
        .from('batches')
        .insert({
            mentor_id: mentorId,
            name,
            description,
            batch_code: batchCode
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const getMentorBatches = async (mentorId: string) => {
    const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('mentor_id', mentorId)
        .order('created_at', { ascending: false });
    
    if (error) console.error("Error fetching mentor batches:", error);
    return data || [];
};

export const updateBatchMeetingLink = async (batchId: string, meetingLink: string | null) => {
    const { data, error } = await supabase
        .from('batches')
        .update({ meeting_link: meetingLink })
        .eq('id', batchId)
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const getStudentBatches = async (userId: string) => {
    const { data, error } = await supabase
        .from('batch_members')
        .select('*, batches(*, mentors(full_name))')
        .eq('user_id', userId);
    
    if (error) console.error("Error fetching student batches:", error);
    return data || [];
};

export const joinBatch = async (userId: string, batchCode: string) => {
    // First find the batch by code
    const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('id')
        .eq('batch_code', batchCode.trim().toUpperCase())
        .single();
    
    if (batchError || !batch) {
        console.error("Batch fetch error:", batchError);
        throw new Error("Batch not found. Please check the code.");
    }
    
    const { data, error } = await supabase
        .from('batch_members')
        .insert({
            batch_id: batch.id,
            user_id: userId,
            status: 'PENDING'
        })
        .select()
        .single();
    
    if (error) {
        if (error.code === '23505') throw new Error("You are already a member of this batch.");
        throw error;
    }
    return data;
};

export const getBatchMembers = async (batchId: string) => {
    const { data: members, error } = await supabase
        .from('batch_members')
        .select('*')
        .eq('batch_id', batchId);
    
    if (error) {
        console.error("Error fetching batch members:", error);
        return [];
    }
    
    if (!members || members.length === 0) return [];
    
    const userIds = members.map(m => m.user_id);
    
    const { data: aspirants, error: aspError } = await supabase
        .from('aspirants')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
        
    if (aspError) {
        console.error("Error fetching aspirants for batch members:", aspError);
    }
    
    return members.map(m => {
        const aspirant = aspirants?.find(a => a.user_id === m.user_id);
        return {
            ...m,
            aspirants: aspirant || null
        };
    });
};

export const updateBatchMemberStatus = async (batchId: string, userId: string, status: 'APPROVED' | 'REJECTED') => {
    const { error } = await supabase
        .from('batch_members')
        .update({ status })
        .eq('batch_id', batchId)
        .eq('user_id', userId);
    
    if (error) throw error;
};

export const removeBatchMember = async (batchId: string, userId: string) => {
    const { error } = await supabase
        .from('batch_members')
        .delete()
        .eq('batch_id', batchId)
        .eq('user_id', userId);
    
    if (error) throw error;
};

export const scheduleBatchTest = async (batchId: string, testType: string, testConfig: any, scheduledAt: string, deadline?: string) => {
    const { data, error } = await supabase
        .from('batch_tests')
        .insert({
            batch_id: batchId,
            test_type: testType,
            test_config: testConfig,
            scheduled_at: scheduledAt,
            deadline: deadline || null
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const getBatchTests = async (batchId: string) => {
    const { data, error } = await supabase
        .from('batch_tests')
        .select('*')
        .eq('batch_id', batchId)
        .order('scheduled_at', { ascending: true });
    
    if (error) console.error("Error fetching batch tests:", error);
    return data || [];
};

export const submitBatchTest = async (batchTestId: string, userId: string, responseData: any) => {
    const { data, error } = await supabase
        .from('batch_test_submissions')
        .insert({
            batch_test_id: batchTestId,
            user_id: userId,
            response_data: responseData,
            status: 'submitted'
        })
        .select()
        .single();
    
    if (error) {
        if (error.code === '23505') throw new Error("You have already submitted this test.");
        throw error;
    }
    return data;
};

export const getBatchSubmissions = async (batchTestId: string) => {
    const { data, error } = await supabase
        .from('batch_test_submissions')
        .select('*, aspirants!user_id(full_name, user_id), batch_tests(test_type)')
        .eq('batch_test_id', batchTestId);
    
    if (error) {
        console.error("Error fetching batch submissions:", error);
        // Fallback: fetch without join if join fails
        const { data: simpleData, error: simpleError } = await supabase
            .from('batch_test_submissions')
            .select('*, batch_tests(test_type)')
            .eq('batch_test_id', batchTestId);
        
        const flattenedFallback = simpleData?.map(s => ({
            ...s,
            test_type: s.batch_tests?.test_type
        }));
        return flattenedFallback || [];
    }
    
    // Flatten the test_type for easier access
    const flattenedData = data?.map(s => {
        const batchTest = Array.isArray(s.batch_tests) ? s.batch_tests[0] : s.batch_tests;
        return {
            ...s,
            test_type: batchTest?.test_type
        };
    });
    
    return flattenedData || [];
};

export const getStudentSubmissions = async (userId: string) => {
    const { data, error } = await supabase
        .from('batch_test_submissions')
        .select('*, batch_tests(*, batches(name))')
        .eq('user_id', userId);
    
    if (error) console.error("Error fetching student submissions:", error);
    
    // Flatten for easier access
    const flattenedData = data?.map(s => {
        const batchTest = Array.isArray(s.batch_tests) ? s.batch_tests[0] : s.batch_tests;
        return {
            ...s,
            test_type: batchTest?.test_type
        };
    });
    
    return flattenedData || [];
};

export const reviewBatchSubmission = async (submissionId: string, score: number, remarks: string) => {
    const { data, error } = await supabase
        .from('batch_test_submissions')
        .update({
            score,
            mentor_remarks: remarks,
            status: 'reviewed'
        })
        .eq('id', submissionId)
        .select()
        .single();
    
    if (error) throw error;
    return data;
};
