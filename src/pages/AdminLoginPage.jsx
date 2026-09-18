import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { isGoogleLoginConfigured, signInWithGoogle } from '../auth/googleIdentity.js';

export default function AdminLoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const submittingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const googleConfigured = isGoogleLoginConfigured();

  if (auth.isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || '/admin'} replace />;
  }

  async function handleGoogleLogin() {
    if (submittingRef.current) return;

    if (!googleConfigured) {
      toast.error('Lengkapi Firebase Web Config dulu di frontend/.env');
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const idToken = await signInWithGoogle();
      await auth.login({ idToken });
      toast.success('Login Google berhasil');
      navigate(location.state?.from?.pathname || '/admin', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Google login gagal');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <section className="grid min-h-screen place-items-center bg-linen px-5 py-12">
      <div className="w-full max-w-md rounded-lg border border-ink/15 bg-white p-6 shadow-glow">
        <div className="text-center">
          <p className="eyebrow">Admin access</p>
          <h1 className="mt-3 font-display text-4xl leading-tight">Event Manager Login</h1>
          <p className="mt-4 text-sm leading-6 text-ink/58">
            Login hanya memakai akun Google yang sudah diberi role untuk mengelola undangan dan check-in.
          </p>
        </div>

        <div className="mt-8 rounded-md border border-ink/10 bg-linen/65 p-4">
          <div className="mb-4 flex items-center gap-3 text-left">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white">
              <ShieldCheck size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Google-only sign in</p>
              <p className="text-xs leading-5 text-ink/55">Akses panel mengikuti role email Google.</p>
            </div>
          </div>

          <button className="button-primary w-full" onClick={handleGoogleLogin} disabled={loading}>
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white font-semibold text-ink">G</span>
            {loading ? 'Verifying account...' : 'Continue with Google'}
          </button>

          {!googleConfigured && (
            <div className="mt-4 rounded-md border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              Lengkapi Firebase Web Config di <code>frontend/.env</code>, lalu enable Google di Firebase Authentication.
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-ink/45">
          Username dan password lokal sudah dinonaktifkan.
        </p>
      </div>
    </section>
  );
}
