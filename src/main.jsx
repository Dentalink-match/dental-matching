import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';
import { SupabaseAuthProvider } from '@/contexts/SupabaseAuthContext';
import { DataProvider } from '@/contexts/DataContext';
import { EcommerceProvider } from '@/contexts/EcommerceContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SupabaseAuthProvider>
      <DataProvider>
        <EcommerceProvider>
          <App />
          <Toaster />
        </EcommerceProvider>
      </DataProvider>
    </SupabaseAuthProvider>
  </React.StrictMode>
);