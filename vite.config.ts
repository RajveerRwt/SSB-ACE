
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    // Removed duplicate css/postcss config to allow postcss.config.js to handle Tailwind correctly
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || ''),
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || ''),
      'process.env.REACT_APP_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || env.REACT_APP_SUPABASE_URL || ''),
      'process.env.REACT_APP_SUPABASE_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY || env.VITE_SUPABASE_KEY || ''),
      // Robustly handle Razorpay key: check process.env directly first, then loadEnv results
      'process.env.RAZORPAY_KEY_ID': JSON.stringify(process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || env.VITE_RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID || ''),
      'import.meta.env.VITE_RAZORPAY_KEY_ID': JSON.stringify(process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || env.VITE_RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID || ''),
    },
    server: {
      port: 3000,
      host: true
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});
