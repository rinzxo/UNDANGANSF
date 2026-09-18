import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import toast, { resolveValue, Toaster } from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
import App from './App.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import './styles.css';

const notificationConfig = {
  success: {
    icon: CheckCircle2,
    title: 'Berhasil'
  },
  error: {
    icon: AlertTriangle,
    title: 'Perhatian'
  },
  loading: {
    icon: Loader2,
    title: 'Memproses'
  },
  blank: {
    icon: Info,
    title: 'Notifikasi'
  }
};

function AppNotification({ item }) {
  const config = notificationConfig[item.type] || notificationConfig.blank;
  const Icon = config.icon;

  return (
    <div
      className={`app-notification-backdrop ${item.visible ? 'is-visible' : ''}`}
      onClick={() => toast.dismiss(item.id)}
    >
      <div
        className={`app-notification-card app-notification-${item.type}`}
        role={item.ariaProps?.role || 'status'}
        aria-live={item.ariaProps?.['aria-live'] || 'polite'}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="app-notification-icon" aria-hidden="true">
          <Icon size={22} className={item.type === 'loading' ? 'app-notification-spinner' : ''} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="app-notification-eyebrow">{config.title}</p>
          <div className="app-notification-message">
            {resolveValue(item.message, item)}
          </div>
        </div>
        <button
          type="button"
          className="app-notification-close"
          onClick={() => toast.dismiss(item.id)}
          aria-label="Tutup notifikasi"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
      <Toaster
        position="top-center"
        toastOptions={{ duration: 3600 }}
        containerStyle={{
          inset: 0,
          zIndex: 10000,
          pointerEvents: 'none'
        }}
      >
        {(item) => <AppNotification item={item} />}
      </Toaster>
    </BrowserRouter>
  </React.StrictMode>
);
