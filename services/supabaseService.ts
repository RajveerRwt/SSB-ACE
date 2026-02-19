import { createClient } from '@supabase/supabase-js';
import { PIQData, UserSubscription, Announcement } from '../types';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const TEST_RATES = {
    PPDT: 5,
    SRT: 5,
    WAT: 5,
    LECTURETTE: 3, 
    SDT: 5,
    TAT: 10,
    OIR: 10, 
    OIR_SUDDEN_DEATH: 5, 
    INTERVIEW_TRIAL: 20, 
    INTERVIEW_FULL: 100   
};

// --- NEW ASSESSMENT REPORTS DEDICATED TABLE LOGIC ---

/**
 * Saves a full assessment to the dedicated reports table.
 * Storing both inputs (for recovery) and results (for viewing).
 */
export const saveAssessmentReport = async (userId: string, testType: string, inputData: any, reportData: any) => {
    const isError = reportData.error || reportData.score === 0;
    
    const { data, error } = await supabase
      .from('assessment_reports')
      .insert({
          user_id: userId,
          test_type: testType,
          status: isError ? 'PENDING' : 'COMPLETED',
          input_data: inputData, // Original stories, images, transcripts
          report_data: reportData, // Full AI analysis JSON
          score: reportData.score || 0
      }).select().single();
    
    if (error) console.error("Error saving assessment report:", error);

    // Also sync to legacy test_history for leaderboard/dashboard compatibility if needed
    await supabase.from('test_history').insert({
        user_id: userId,
        test_type: testType,
        score: reportData.score || 0,
        result_data: { report_id: data?.id, ...reportData }
    });

    return data;
};

export const getAssessmentReports = async (userId: string) => {
    const { data, error } = await supabase
      .from('assessment_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) return [];
    return data;
};

export const updateAssessmentReport = async (reportId: string, reportData: any) => {
    const { error } = await supabase
      .from('assessment_reports')
      .update({
          status: 'COMPLETED',
          report_data: reportData,
          score: reportData.score || 0
      })
      .eq('id', reportId);
    
    if (error) throw error;
};

// --- EXISTING SERVICES UPDATED ---

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
  let query = supabase.from('test_history').select('score, created_at, result_data, aspirants(full_name, user_id)').eq('test_type', dbTestType).order('score', { ascending: false }).limit(50);
  if (type === 'STANDARD' && setId) query = query.contains('result_data', { setId: setId });
  const { data, error } = await query;
  if (error) return [];
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
  await supabase.from('oir_questions').insert({ set_id: setId, question_text: text, image_url: imageUrl, options, correct_index: correctIndex });
};

export const deleteOIRQuestion = async (id: string) => { await supabase.from('oir_questions').delete().eq('id', id); };
export const getOIRDoubts = async (questionId: string) => { const { data } = await supabase.from('oir_doubts').select('*').eq('question_id', questionId).order('created_at', { ascending: false }); return data || []; };
export const postOIRDoubt = async (questionId: string, userId: string, userName: string, comment: string) => { await supabase.from('oir_doubts').insert({ question_id: questionId, user_id: userId, user_name: userName, comment }); };
export const getCachedContent = async (category: string, dateKey: string) => { const { data } = await supabase.from('daily_cache').select('content').eq('category', category).eq('date_key', dateKey).maybeSingle(); return data?.content || null; };
export const setCachedContent = async (category: string, dateKey: string, content: any) => { await supabase.from('daily_cache').upsert({ category, date_key: dateKey, content }, { onConflict: 'category,date_key' }); };
export const getLecturetteContent = async (topic: string) => { const { data } = await supabase.from('lecturette_topics').select('content').eq('topic', topic).maybeSingle(); return data?.content || null; };
export const saveLecturetteContent = async (topic: string, board: string, category: string, content: any) => { await supabase.from('lecturette_topics').upsert({ topic, board, category, content }, { onConflict: 'topic' }); };
export const getTickerConfig = async () => { const { data } = await supabase.from('ticker_config').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(); return data || { message: '', is_active: false, speed: 25 }; };
export const updateTickerConfig = async (message: string, is_active: boolean, speed: number) => { await supabase.from('ticker_config').insert({ message, is_active, speed }); };
export const subscribeToTicker = (callback: (config: any) => void) => { const channel = supabase.channel('public:ticker_config').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticker_config' }, payload => { callback(payload.new); }).subscribe(); return () => { supabase.removeChannel(channel); }; };

export const signInWithEmail = async (email: string, password: string) => {
  const auth = supabase.auth as any;
  return await auth.signInWithPassword({ email, password });
};

export const signInWithGoogle = async () => {
  const auth = supabase.auth as any;
  return await auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
};

export const signUpWithEmail = async (email: string, password: string, fullName: string) => {
  const auth = supabase.auth as any;
  return await auth.signUp({ email, password, options: { data: { full_name: fullName } } });
};

export const logoutUser = async () => { await (supabase.auth as any).signOut(); };
export const checkAuthSession = async () => { const auth = supabase.auth as any; const { data: { session } } = await auth.getSession(); return session?.user || null; };
export const subscribeToAuthChanges = (callback: (user: any) => void) => { const auth = supabase.auth as any; const { data } = auth.onAuthStateChange((_event: any, session: any) => { callback(session?.user || null); }); return () => { if (data?.subscription?.unsubscribe) data.subscription.unsubscribe(); }; };
export const isUserAdmin = (email: string | null | undefined) => { const adminEmails = ['rajveerrawat947@gmail.com', 'admin@ssbprep.online']; return email ? adminEmails.includes(email) : false; };

export const syncUserProfile = async (user: any) => {
  if (!user) return;
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || 'Cadet';
  await supabase.from('aspirants').upsert({ user_id: user.id, email: user.email, full_name: fullName, last_active: new Date().toISOString() }, { onConflict: 'user_id' });
  const { data: sub } = await supabase.from('user_subscriptions').select('tier').eq('user_id', user.id).maybeSingle(); 
  if (!sub) {
      await supabase.from('user_subscriptions').insert({ user_id: user.id, tier: 'FREE', coins: 50, usage: { interview_used: 0, interview_limit: 1, ppdt_used: 0, ppdt_limit: 10, tat_used: 0, tat_limit: 2, wat_used: 0, wat_limit: 3, srt_used: 0, srt_limit: 3, sdt_used: 0 }, extra_credits: { interview: 0 } });
  }
};

export const getUserData = async (userId: string): Promise<PIQData | null> => { const { data } = await supabase.from('aspirants').select('piq_data').eq('user_id', userId).maybeSingle(); return data?.piq_data || null; };
export const saveUserData = async (userId: string, data: PIQData) => { await supabase.from('aspirants').update({ piq_data: data }).eq('user_id', userId); };

export const getUserHistory = async (userId: string) => {
  const { data } = await supabase.from('assessment_reports').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
  return data?.map((item: any) => ({
      ...item,
      type: item.test_type, // Ensure compatibility with existing dashboard
      timestamp: item.created_at
  })) || [];
};

export const getUserStreak = async (userId: string) => { const { data } = await supabase.from('aspirants').select('streak_count').eq('user_id', userId).maybeSingle(); return data || { streak_count: 0 }; };

export const getUserSubscription = async (userId: string): Promise<UserSubscription> => {
  let { data: sub } = await supabase.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle();
  if (!sub) return { tier: 'FREE', coins: 0, expiryDate: null, usage: { interview_used: 0, interview_limit: 1, ppdt_used: 0, ppdt_limit: 10, tat_used: 0, tat_limit: 2, wat_used: 0, wat_limit: 3, srt_used: 0, srt_limit: 3, sdt_used: 0 }, extra_credits: { interview: 0 } };
  return sub;
};

export const checkBalance = async (userId: string, cost: number) => { const sub = await getUserSubscription(userId); if (sub.coins >= cost) return { allowed: true, balance: sub.coins }; return { allowed: false, balance: sub.coins, shortfall: cost - sub.coins }; };
export const deductCoins = async (userId: string, amount: number) => { const { data: sub } = await supabase.from('user_subscriptions').select('coins').eq('user_id', userId).single(); if (!sub || sub.coins < amount) return false; const { error } = await supabase.from('user_subscriptions').update({ coins: sub.coins - amount }).eq('user_id', userId); return !error; };
export const checkLimit = async (userId: string, testType: string) => { return { allowed: true, message: "" }; };
export const incrementUsage = async (userId: string, testType: string) => {
  const sub = await getUserSubscription(userId);
  const usage = sub.usage;
  let update: any = {};
  if (testType === 'INTERVIEW') update = { 'usage': { ...usage, interview_used: usage.interview_used + 1 } };
  else if (testType === 'PPDT') update = { 'usage': { ...usage, ppdt_used: usage.ppdt_used + 1 } };
  else if (testType === 'TAT') update = { 'usage': { ...usage, tat_used: usage.tat_used + 1 } };
  else if (testType === 'WAT') update = { 'usage': { ...usage, wat_used: usage.wat_used + 1 } };
  else if (testType === 'SRT') update = { 'usage': { ...usage, srt_used: usage.srt_used + 1 } };
  if (Object.keys(update).length > 0) await supabase.from('user_subscriptions').update(update).eq('user_id', userId);
};

export const getLatestPaymentRequest = async (userId: string) => { const { data } = await supabase.from('payment_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(); return data; };
export const getPendingPayments = async () => { const { data } = await supabase.from('payment_requests').select('*, aspirants(full_name, email)').eq('status', 'PENDING').order('created_at', { ascending: false }); return data || []; };
export const approvePaymentRequest = async (id: string, userId: string, planType: string) => { const { data: req } = await supabase.from('payment_requests').select('amount').eq('id', id).single(); await supabase.from('payment_requests').update({ status: 'APPROVED' }).eq('id', id); await activatePlanForUser(userId, planType, req?.amount || 0); };
export const rejectPaymentRequest = async (id: string) => { await supabase.from('payment_requests').update({ status: 'REJECTED' }).eq('id', id); };
export const activatePlanForUser = async (userId: string, planType: string, amount?: number, coinsCredit?: number) => {
    const { data: sub } = await supabase.from('user_subscriptions').select('coins').eq('user_id', userId).single();
    let coinsToAdd = coinsCredit !== undefined ? coinsCredit : (amount || 0);
    if (planType === 'COIN_PACK' && amount) { if (amount === 100) coinsToAdd = 110; else if (amount === 200) coinsToAdd = 230; else if (amount === 300) coinsToAdd = 350; }
    await supabase.from('user_subscriptions').update({ coins: (sub?.coins || 0) + coinsToAdd }).eq('user_id', userId);
};

export const getPPDTScenarios = async () => { const { data } = await supabase.from('ppdt_scenarios').select('*'); return data || []; };
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
export const uploadDailyChallenge = async (oirFile: File | null, oirText: string, wat: string, srt: string, interview: string) => { let oirUrl = null; if (oirFile) { const fileName = `daily-oir-${Date.now()}-${oirFile.name}`; await supabase.storage.from('scenarios').upload(fileName, oirFile); const { data } = supabase.storage.from('scenarios').getPublicUrl(fileName); oirUrl = data.publicUrl; } await supabase.from('daily_challenges').insert({ ppdt_image_url: oirUrl, oir_text: oirText, wat_words: [wat], srt_situations: [srt], interview_question: interview }); };
export const submitDailyEntry = async (challengeId: string, oirAnswer: string, wat: string, srt: string, interview: string) => { const auth = supabase.auth as any; const user = (await auth.getUser()).data.user; if (!user) throw new Error("Login Required"); await supabase.from('daily_submissions').insert({ challenge_id: challengeId, user_id: user.id, ppdt_story: oirAnswer, wat_answers: [wat], srt_answers: [srt], interview_answer: interview }); };
export const getDailySubmissions = async (challengeId: string) => { const { data: submissions } = await supabase.from('daily_submissions').select('*').eq('challenge_id', challengeId).order('created_at', { ascending: false }); if (!submissions || submissions.length === 0) return []; const userIds = [...new Set(submissions.map(r => r.user_id))]; const { data: profiles } = await supabase.from('aspirants').select('user_id, full_name, streak_count').in('user_id', userIds); return submissions.map(sub => { const profile = profiles?.find(p => p.user_id === sub.user_id); return { ...sub, aspirants: profile || { full_name: 'Cadet', streak_count: 0 } }; }); };
export const toggleLike = async (submissionId: string, isLike: boolean) => { const { data: sub } = await supabase.from('daily_submissions').select('likes_count').eq('id', submissionId).single(); if (sub) { await supabase.from('daily_submissions').update({ likes_count: Math.max(0, (sub.likes_count || 0) + (isLike ? 1 : -1)) }).eq('id', submissionId); } };
export const getRecentAnnouncements = async (): Promise<Announcement[]> => { const { data } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5); return data || []; };
export const subscribeToAnnouncements = (callback: (a: Announcement) => void) => { const channel = supabase.channel('public:announcements').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, payload => { callback(payload.new as Announcement); }).subscribe(); return () => { supabase.removeChannel(channel); }; };
export const sendAnnouncement = async (message: string, type: 'INFO' | 'WARNING' | 'SUCCESS' | 'URGENT') => { await supabase.from('announcements').insert({ message, type, is_active: true }); };
export const submitUserFeedback = async (userId: string, testType: string, rating: number, comments: string) => { await supabase.from('user_feedback').insert({ user_id: userId, test_type: testType, rating: rating, comments: comments }); };
export const getAllFeedback = async () => { const { data } = await supabase.from('user_feedback').select('*, aspirants(full_name, email)').order('created_at', { ascending: false }); return data || []; };
export const deleteFeedback = async (id: string) => { await supabase.from('user_feedback').delete().eq('id', id); };
export const processRazorpayTransaction = async (userId: string, paymentId: string, amount: number, planType: string, couponCode?: string, coinsCredit?: number) => {};
export const getAllUsers = async () => {return []};
export const deleteUserProfile = async (userId: string) => {};
export const saveTestAttempt = async (userId: string, testType: string, resultData: any) => {};
export const updateTestAttempt = async (id: string, resultData: any) => {};
