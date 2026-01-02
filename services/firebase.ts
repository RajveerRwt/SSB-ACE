import { createClient } from '@supabase/supabase-js';
import { PIQData } from '../types';

// --- SUPABASE CONFIGURATION ---
// Replace these with your actual Supabase project URL and Anon Key
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_KEY || 'your-anon-key';

let supabase: any = null;
let isSupabaseActive = false;

try {
  if (SUPABASE_URL !== 'https://your-project.supabase.co' && SUPABASE_ANON_KEY !== 'your-anon-key') {
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      isSupabaseActive = true;
      console.log("SSBzone: Supabase Client Initialized.");
  } else {
      console.warn("SSBzone: Supabase credentials missing. Using LocalStorage Fallback.");
  }
} catch (error) {
  console.error("SSBzone: Supabase init failed", error);
}

/**
 * Check for existing session (e.g. after redirect)
 */
export async function checkAuthSession() {
  if (!isSupabaseActive || !supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  } catch (e) {
    return null;
  }
}

/**
 * Login with Google (via Supabase)
 */
export async function loginWithGoogle() {
  if (!isSupabaseActive || !supabase) {
      console.warn("Supabase not configured. Returning Demo User.");
      return {
          id: 'demo-user-123',
          email: 'cadet@ssbzone.com',
          user_metadata: { full_name: 'Demo Candidate' }
      };
  }
  
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    
    if (error) throw error;
    
    // Note: OAuth with Supabase typically redirects the page. 
    // The promise might not resolve with the user immediately in this flow.
    return null; 
  } catch (error: any) {
    console.error("Supabase Login Error:", error);
    throw error;
  }
}

/**
 * Logout
 */
export async function logoutUser() {
  if (isSupabaseActive && supabase) {
    await supabase.auth.signOut();
  }
}

/**
 * Saves or Updates User Data (PIQ)
 */
export async function saveUserData(userId: string, data: Partial<PIQData>) {
  if (isSupabaseActive && supabase) {
    try {
      // Assuming table 'aspirants' exists with columns: user_id (primary), piq_data (jsonb), last_active (timestamp)
      const { error } = await supabase
        .from('aspirants')
        .upsert({ 
          user_id: userId, 
          piq_data: data, 
          last_active: new Date().toISOString() 
        }, { onConflict: 'user_id' });

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Error saving to Supabase:", error);
      saveToLocal(userId, data);
      return false;
    }
  } else {
    saveToLocal(userId, data);
    return true;
  }
}

/**
 * Saves a completed Test Result to the user's history
 */
export async function saveTestAttempt(userId: string, testType: string, resultData: any) {
  if (isSupabaseActive && supabase) {
    try {
      // Assuming table 'test_history' exists with: id (uuid), user_id (uuid), test_type (text), score (numeric), result_data (jsonb), created_at (timestamp)
      const { error } = await supabase
        .from('test_history')
        .insert({
          user_id: userId,
          test_type: testType,
          score: resultData.score || 0,
          result_data: resultData,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      console.log(`SSBzone: Saved ${testType} result to cloud.`);
      return true;
    } catch (error: any) {
      console.error("Error saving test result:", error);
      return false;
    }
  }
  return false;
}

/**
 * Loads User Data
 */
export async function getUserData(userId: string): Promise<PIQData | null> {
  if (isSupabaseActive && supabase) {
    try {
      const { data, error } = await supabase
        .from('aspirants')
        .select('piq_data')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'not found'
      
      if (data) {
        return data.piq_data as PIQData;
      } else {
        return loadFromLocal(userId);
      }
    } catch (error: any) {
      console.error("Error loading from cloud:", error);
      return loadFromLocal(userId);
    }
  } else {
    return loadFromLocal(userId);
  }
}

/**
 * Get Past Test History (Last 5)
 */
export async function getUserHistory(userId: string) {
  if (isSupabaseActive && supabase) {
    try {
      const { data, error } = await supabase
        .from('test_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      return data.map((item: any) => ({
        id: item.id,
        type: item.test_type,
        timestamp: item.created_at,
        score: item.score,
        result: item.result_data
      }));
    } catch (error) {
      console.error("Error fetching history:", error);
      return [];
    }
  }
  return [];
}

// --- Local Storage Helpers for Fallback ---

function saveToLocal(userId: string, data: Partial<PIQData>) {
  try {
    const existing = localStorage.getItem(`ssb_data_${userId}`);
    let merged = data;
    if (existing) {
        const parsed = JSON.parse(existing);
        merged = { ...parsed, ...data };
    }
    localStorage.setItem(`ssb_data_${userId}`, JSON.stringify(merged));
    // Keep legacy support
    localStorage.setItem('ssb_piq_data', JSON.stringify(merged)); 
  } catch (e) {
    console.warn("Local storage save failed", e);
  }
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

export { supabase }; // Export for custom queries if needed
