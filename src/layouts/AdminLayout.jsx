import { useState } from 'react';
import toast from 'react-hot-toast';
import { NavLink, Outlet } from 'react-router-dom';
import { ClipboardList, KeyRound, LogOut, QrCode, Send, Settings, ShieldAlert, Users, UserCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { requestAdminRole } from '../api/client.js';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: ClipboardList, end: true, roles: ['receptionist', 'admin', 'super_admin'] },
  { to: '/admin/guests', label: 'Guest List', icon: Users, roles: ['receptionist', 'admin', 'super_admin'] },
  { to: '/admin/scanner', label: 'QR Scanner', icon: QrCode, roles: ['receptionist', 'admin', 'super_admin'] },
  { to: '/admin/access', label: 'Access', icon: KeyRound, roles: ['super_admin'] },
  { to: '/admin/settings', label: 'Settings', icon: Settings, roles: ['super_admin'] }
];

export default function AdminLayout() {
  const auth = useAuth();
  const isPending = auth.user?.role === 'pending';
  const visibleNavItems = navItems.filter((item) => !item.roles || item.roles.includes(auth.user?.role));

  return (
    <div className="min-h-screen bg-linen text-ink lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-ink/15 bg-white lg:flex lg:min-h-screen lg:flex-col lg:justify-between">
        <div>
          <NavLink to="/admin" className="block border-b border-ink/15 px-6 py-7">
            <p className="font-display text-3xl leading-tight">Event<br />Manager</p>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70">admin suite</p>
          </NavLink>

          <nav className="space-y-1.5 px-2.5 py-4">
            {visibleNavItems.map((item) => (
              <NavItem key={item.to} item={item} />
            ))}
          </nav>
        </div>

        <div className="border-t border-ink/15 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-ink/20 bg-champagne">
              <UserCheck size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Wedding Admin</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ink/50">{formatRole(auth.user?.role)}</p>
            </div>
          </div>
          <button className="button-secondary mt-4 w-full" onClick={auth.logout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-ink/15 bg-linen/95 px-4 py-4 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <NavLink to="/admin">
            <p className="font-display text-3xl">Event Manager</p>
          </NavLink>
          <nav className="flex gap-1 overflow-x-auto">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                aria-label={item.label}
                title={item.label}
                onClick={releaseCameraBeforeNavigation}
                className={({ isActive }) =>
                  `grid h-10 w-10 shrink-0 place-items-center rounded-md transition ${
                    isActive ? 'bg-ink text-white' : 'border border-ink/15 bg-white text-ink'
                  }`
                }
              >
                <item.icon size={18} />
              </NavLink>
            ))}
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-ink/15 bg-white text-ink"
              onClick={auth.logout}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </nav>
        </div>
      </header>

      <main className="min-w-0 px-4 py-7 sm:px-7 lg:px-8 lg:py-9 xl:px-10">
        {isPending ? <PendingRoleAccess /> : <Outlet />}
      </main>
    </div>
  );
}

function PendingRoleAccess() {
  const auth = useAuth();
  const [requestedRole, setRequestedRole] = useState('admin');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      await requestAdminRole({ requestedRole, message });
      setSubmitted(true);
      toast.success('Request role berhasil dikirim');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Request role gagal dikirim');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid min-h-[70vh] place-items-center">
      <div className="fixed inset-0 z-40 grid place-items-center bg-ink/45 px-4 backdrop-blur-sm">
        <form className="w-full max-w-lg rounded-lg border border-ink/15 bg-white p-6 shadow-glow" onSubmit={handleSubmit}>
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-white">
              <ShieldAlert size={22} />
            </span>
            <div>
              <p className="eyebrow">Role required</p>
              <h1 className="mt-2 font-display text-4xl leading-tight">Request Admin Access</h1>
              <p className="mt-3 text-sm leading-6 text-ink/58">
                Login Google berhasil. Akun ini belum punya role, jadi pilih akses yang dibutuhkan lalu tunggu super admin mengaktifkannya.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-md border border-ink/10 bg-linen p-4 text-sm leading-6">
            <p className="font-semibold">{auth.user?.name || 'Google User'}</p>
            <p className="text-ink/55">{auth.user?.email}</p>
          </div>

          <div className="mt-5 grid gap-4">
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-ink/50">Requested role</span>
              <select className="field" value={requestedRole} onChange={(event) => setRequestedRole(event.target.value)} disabled={submitted}>
                <option value="receptionist">Resepsionis</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-ink/50">Note</span>
              <textarea
                className="field min-h-24 resize-y"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Contoh: Saya bagian resepsionis untuk acara hari H."
                disabled={submitted}
              />
            </label>
          </div>

          {submitted ? (
            <div className="mt-6 rounded-md border border-emerald-500/25 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
              Request sudah dikirim. Minta super admin approve dari menu Access, lalu logout dan login ulang.
            </div>
          ) : (
            <button className="button-primary mt-6 w-full" disabled={loading}>
              <Send size={17} />
              {loading ? 'Sending request...' : 'Send role request'}
            </button>
          )}

          <button type="button" className="button-secondary mt-3 w-full" onClick={auth.logout}>
            <LogOut size={16} />
            Logout
          </button>
        </form>
      </div>
    </section>
  );
}

function NavItem({ item }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={releaseCameraBeforeNavigation}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-md px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] transition ${
          isActive ? 'bg-ink text-white' : 'text-ink/70 hover:bg-linen hover:text-ink'
        }`
      }
    >
      <item.icon className="shrink-0" size={18} />
      {item.label}
    </NavLink>
  );
}

function releaseCameraBeforeNavigation() {
  window.dispatchEvent(new Event('wedding:release-camera'));
}

function formatRole(role) {
  const labels = {
    receptionist: 'resepsionis',
    admin: 'admin',
    super_admin: 'super admin',
    pending: 'pending role'
  };

  return labels[role] || 'signed in';
}
