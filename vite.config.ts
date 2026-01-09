import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig(({ mode }) => {
  // Fix: Property 'cwd' does not exist on type 'Process' in some TS environments
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    css: {
      postcss: {
        plugins: [
          tailwindcss,
          autoprefixer,
        ],
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || (process as any).env.API_KEY),
      'process.env.REACT_APP_SUPABASE_URL': JSON.stringify(env.REACT_APP_SUPABASE_URL || (process as any).env.REACT_APP_SUPABASE_URL),
      'process.env.REACT_APP_SUPABASE_KEY': JSON.stringify(env.REACT_APP_SUPABASE_KEY || (process as any).env.REACT_APP_SUPABASE_KEY),
    },
    server: {
      port: 3000,
      host: true
    }
  };
});