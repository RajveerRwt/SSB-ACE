
import { createClient } from '@supabase/supabase-js';
import { PIQData } from '../types';

/* 
================================================================================
STEP 1: DATABASE SETUP
Run the SQL script provided in the instructions to create 'aspirants', 'test_history',
and 'ppdt_scenarios' tables in your Supabase SQL Editor.

STEP 2: API KEYS
Go to Project Settings > API in Supabase.
Copy the "Project URL" and the "anon public" key.
Paste them below.
================================================================================
*/

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://nidbiyrliunqhakkqdvn.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJpeXJsaXVucWhha2txZHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjczMTUsImV4cCI6MjA4Mjk0MzMxNX0.FfSHE1ZAokWxbfG6qyCXdnOJpReW5PMyZg4wrN7sjXY';

// *** SECURITY CONFIGURATION ***
// Replace this with your actual admin email address
export const ADMIN_EMAILS = ['rajveerrawat947@gmail.com'];

export const isUserAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
};

let supabase: any = null;
let isSupabaseActive = false;

// Initialize Supabase
try {
  if (SUPABASE_URL && SUPABASE_URL.startsWith('https://')) {
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      isSupabaseActive = true;
      console.log("SSBprep.online: Supabase Client Initialized.");
  } else {
      console.warn("SSBprep.online: Supabase credentials missing. Authentication will fail.");
  }
} catch (error) {
  console.error("SSBprep.online: Supabase init failed", error);
}

/**
 * Check for existing session
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
 * Subscribe to Auth Changes (Handles Email Link Redirects)
 */
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

/**
 * Sign Up with Email and Password
 */
export async function signUpWithEmail(email: string, password: string, fullName: string) {
  if (!isSupabaseActive || !supabase) {
      return { data: null, error: { message: "Cloud services unavailable. Please check API configuration." } };
  }
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });
    return { data, error };
  } catch (error: any) {
    console.error("Supabase Sign Up Error:", error);
    return { data: null, error };
  }
}

/**
 * Sign In with Email and Password
 */
export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseActive || !supabase) {
      return { data: null, error: { message: "Cloud services unavailable. Please check API configuration." } };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  } catch (error: any) {
    console.error("Supabase Sign In Error:", error);
    return { data: null, error };
  }
}

export async function logoutUser() {
  if (isSupabaseActive && supabase) {
    await supabase.auth.signOut();
  }
}

/**
 * Syncs basic user profile details (Email, Name, Avatar) to DB on login
 */
export async function syncUserProfile(user: any) {
  if (!isSupabaseActive || !supabase || user.isMock) return;
  
  try {
    const updates = {
      user_id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      avatar_url: user.user_metadata?.avatar_url || '',
      last_active: new Date().toISOString()
    };

    const { error } = await supabase
      .from('aspirants')
      .upsert(updates, { onConflict: 'user_id' }); 

    if (error) throw error;
  } catch (error) {
    console.error("Error syncing user profile:", error);
  }
}

/**
 * Saves or Updates User Data (PIQ)
 */
export async function saveUserData(userId: string, data: Partial<PIQData>) {
  if (isSupabaseActive && supabase && !userId.startsWith('demo')) {
    try {
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
      console.error("Error saving PIQ to Supabase:", error);
      saveToLocal(userId, data);
      return false;
    }
  } else {
    saveToLocal(userId, data);
    return true;
  }
}

/**
 * Saves a completed Test Result (including Images/Audio in resultData)
 */
export async function saveTestAttempt(userId: string, testType: string, resultData: any) {
  if (isSupabaseActive && supabase && !userId.startsWith('demo')) {
    try {
      const { error } = await supabase
        .from('test_history')
        .insert({
          user_id: userId,
          test_type: testType,
          score: resultData.score || 0,
          result_data: resultData, // Contains analysis AND images if passed
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      console.log(`SSBprep.online: Saved ${testType} result to cloud.`);
      return true;
    } catch (error: any) {
      console.error("Error saving test result:", error);
      return false;
    }
  }
  return false;
}

export async function getUserData(userId: string): Promise<PIQData | null> {
  if (isSupabaseActive && supabase && !userId.startsWith('demo')) {
    try {
      const { data, error } = await supabase
        .from('aspirants')
        .select('piq_data')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) return data.piq_data as PIQData;
    } catch (error: any) {
      console.error("Error loading from cloud:", error);
    }
  }
  return loadFromLocal(userId);
}

export async function getUserHistory(userId: string) {
  if (isSupabaseActive && supabase && !userId.startsWith('demo')) {
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

/* 
  ===========================================
  ADMIN & PPDT IMAGE MANAGEMENT
  ===========================================
*/

export async function uploadPPDTScenario(file: File, description: string) {
  if (!isSupabaseActive || !supabase) throw new Error("Supabase inactive");

  // 1. Upload Image to Storage Bucket 'ppdt-images'
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('ppdt-images')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // 2. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('ppdt-images')
    .getPublicUrl(filePath);

  // 3. Insert Record into Database
  const { data, error: dbError } = await supabase
    .from('ppdt_scenarios')
    .insert([
      { 
        image_url: publicUrl, 
        description: description 
      }
    ])
    .select();

  if (dbError) throw dbError;
  return data;
}

export async function getPPDTScenarios() {
  if (!isSupabaseActive || !supabase) return [];
  
  const { data, error } = await supabase
    .from('ppdt_scenarios')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching PPDT scenarios:", error);
    return [];
  }
  return data;
}

export async function deletePPDTScenario(id: string, imageUrl: string) {
  if (!isSupabaseActive || !supabase) return;

  // 1. Delete from DB
  const { error: dbError } = await supabase
    .from('ppdt_scenarios')
    .delete()
    .eq('id', id);

  if (dbError) throw dbError;

  // 2. Extract path from URL and Delete from Storage
  // URL format: .../ppdt-images/filename.jpg
  const path = imageUrl.split('/').pop();
  if (path) {
    await supabase.storage
      .from('ppdt-images')
      .remove([path]);
  }
}

// --- Local Storage Fallback ---

function saveToLocal(userId: string, data: Partial<PIQData>) {
  try {
    const existing = localStorage.getItem(`ssb_data_${userId}`);
    let merged = data;
    if (existing) {
        const parsed = JSON.parse(existing);
        merged = { ...parsed, ...data };
    }
    localStorage.setItem(`ssb_data_${userId}`, JSON.stringify(merged));
  } catch (e) {}
}

function loadFromLocal(userId: string): PIQData | null {
  try {
    const data = localStorage.getItem(`ssb_data_${userId}`);
    if (data) return JSON.parse(data);
    return null;
  } catch (e) {
    return null;
  }
}

export { supabase };