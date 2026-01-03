import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // MERGE process.env (System/Vercel vars) with env (File vars)
  // This ensures API_KEY defined in Vercel Settings is picked up.
  const combinedEnv = { ...process.env, ...env };

  return {
    plugins: [react()],
    define: {
      // Vital: Maps process.env to the actual environment variables during build
      'process.env.API_KEY': JSON.stringify(combinedEnv.API_KEY),
      'process.env.REACT_APP_SUPABASE_URL': JSON.stringify(combinedEnv.REACT_APP_SUPABASE_URL),
      'process.env.REACT_APP_SUPABASE_KEY': JSON.stringify(combinedEnv.REACT_APP_SUPABASE_KEY),
    },
  };
});