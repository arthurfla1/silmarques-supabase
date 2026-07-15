import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

console.log("BUILD TIME DIAGNOSTIC - VITE_SUPABASE_URL:", process.env.VITE_SUPABASE_URL);
console.log("BUILD TIME DIAGNOSTIC - VITE_SUPABASE_ANON_KEY (length):", process.env.VITE_SUPABASE_ANON_KEY ? process.env.VITE_SUPABASE_ANON_KEY.length : "undefined");

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
});
