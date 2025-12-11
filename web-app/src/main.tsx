import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initSupabase } from '@dev-orchestrator/shared'
import './index.css'
import App from './App.tsx'

// Initialize Supabase with environment variables
initSupabase({
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
