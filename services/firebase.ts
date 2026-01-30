
import { createClient } from '@supabase/supabase-js';
import { PIQData } from '../types';

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_KEY || 'placeholder-key';

let supabase: any = null;
let isSupabaseActive = false;

try {
  if (process.env.REACT_APP_SUPABASE_URL) {
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      isSupabaseActive = true;
  }
} catch (error) {
  console.error("SSBzone: Supabase init failed", error);
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

export async function loginWithGoogle() {
  if (!isSupabaseActive || !supabase) {
      return { id: 'demo-user-123', email: 'cadet@ssbzone.com', user_metadata: { full_name: 'Demo Candidate' } };
  }
  try {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    return null; 
  } catch (error: any) {
    throw error;
  }
}

export async function logoutUser() {
  if (isSupabaseActive && supabase) {
    await supabase.auth.signOut();
  }
}

export async function saveUserData(userId: string, data: Partial<PIQData>) {
  if (isSupabaseActive && supabase) {
    try {
      const { error } = await supabase
        .from('aspirants')
        .upsert({ user_id: userId, piq_data: data, last_active: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
      return true;
    } catch (error: any) {
      saveToLocal(userId, data);
      return false;
    }
  } else {
    saveToLocal(userId, data);
    return true;
  }
}

export async function saveTestAttempt(userId: string, testType: string, resultData: any) {
  if (isSupabaseActive && supabase) {
    try {
      const { error } = await supabase
        .from('test_history')
        .insert({ user_id: userId, test_type: testType, score: resultData.score || 0, result_data: resultData, created_at: new Date().toISOString() });
      if (error) throw error;
      return true;
    } catch (error: any) {
      return false;
    }
  }
  return false;
}

export async function getUserData(userId: string): Promise<PIQData | null> {
  if (isSupabaseActive && supabase) {
    try {
      const { data, error } = await supabase.from('aspirants').select('piq_data').eq('user_id', userId).single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) return data.piq_data as PIQData;
      return loadFromLocal(userId);
    } catch (error: any) {
      return loadFromLocal(userId);
    }
  } else {
    return loadFromLocal(userId);
  }
}

export async function getUserHistory(userId: string) {
  if (isSupabaseActive && supabase) {
    try {
      const { data, error } = await supabase.from('test_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5);
      if (error) throw error;
      return data.map((item: any) => ({ id: item.id, type: item.test_type, timestamp: item.created_at, score: item.score, result: item.result_data }));
    } catch (error) {
      return [];
    }
  }
  return [];
}

function saveToLocal(userId: string, data: Partial<PIQData>) {
  try {
    const existing = localStorage.getItem(`ssb_data_${userId}`);
    let merged = data;
    if (existing) {
        const parsed = JSON.parse(existing);
        merged = { ...parsed, ...data };
    }
    localStorage.setItem(`ssb_data_${userId}`, JSON.stringify(merged));
    localStorage.setItem('ssb_piq_data', JSON.stringify(merged)); 
  } catch (e) {}
}

function loadFromLocal(userId: string): PIQData | null {
  try {
    const data = localStorage.getItem(`ssb_data_${userId}`);
    if (data) return JSON.parse(data);
    const legacy = localStorage.getItem('ssb_piq_data');
    if (legacy) return JSON.parse(legacy);
    return null;
  } catch (e) {
    return null;
  }
}

export { supabase };
