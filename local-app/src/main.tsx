import React from 'react'
import ReactDOM from 'react-dom/client'
import { initSupabase } from '@dev-orchestrator/shared'
import App from './App'
import './index.css'

// Initialize Supabase with environment variables
initSupabase({
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
