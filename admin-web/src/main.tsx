/** Điểm vào admin-web Nini Cakes */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AdminAuthProvider } from './hooks/auth';
import { ToastProvider } from './hooks/toast';
import App from './App';

import './styles/tokens.css';
import './styles/base.css';
import './styles/admin.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10_000 },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdminAuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AdminAuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
