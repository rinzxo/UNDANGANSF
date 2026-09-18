import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronRight, QrCode, RefreshCcw, Search, Users, XCircle } from 'lucide-react';
import { fetchGuests, fetchStats } from '../api/client.js';
import { getInvitationStatus } from '../utils/invitationStatus.js';

const categoryOptions = ['All', 'VIP', 'Regular'];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [statsData, guestData] = await Promise.all([fetchStats(), fetchGuests()]);
      setStats(statsData);
      setGuests(guestData);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    const interval = window.setInterval(loadDashboard, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredGuests = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return guests.filter((guest) => {
      const matchesSearch = [guest.name, guest.email, guest.phone]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle));
      const matchesCategory = category === 'All' || guest.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [guests, search, category]);

  const failedCount = guests.filter((guest) => guest.invitation?.status === 'failed').length;
  const pendingCount = guests.filter((guest) => !guest.invitation || guest.invitation?.status === 'pending').length;
  const recentGuests = guests.slice(0, 4);

  return (
    <section className="space-y-7">
      <div>
        <div className="flex flex-col gap-5 border-b border-ink/15 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Overview</p>
            <h1 className="mt-3 font-display text-4xl leading-none sm:text-5xl">At a Glance</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="button-secondary" onClick={loadDashboard} disabled={loading}>
              <RefreshCcw size={18} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Total Invited" value={stats?.totalGuests ?? 0} note={`VIP ${stats?.vipGuests ?? 0} / Regular ${stats?.regularGuests ?? 0}`} icon={Users} active />
        <StatCard label="Needs Review" value={failedCount} note="delivery issues" icon={XCircle} />
        <StatCard label="Checked In" value={stats?.checkedInCount ?? 0} note="reception count" icon={QrCode} />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-5 flex flex-col gap-4 border-b border-ink/15 pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl">Recent Activity</h2>
              <p className="mt-2 text-sm text-ink/55">{filteredGuests.length} visible guests</p>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-[minmax(220px,1fr)_160px] md:max-w-xl">
              <label className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" size={17} />
                <input
                  className="field field-icon-left min-w-0"
                  placeholder="Search name, email, phone"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <select className="field" value={category} onChange={(event) => setCategory(event.target.value)}>
                {categoryOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-ink/15 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-ink/15 bg-linen">
                  <tr>
                    <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55">Guest</th>
                    <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55">Contact</th>
                    <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55">Category</th>
                    <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55">Invitation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuests.slice(0, 6).map((guest) => (
                    <tr key={guest.id} className="border-t border-ink/10">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Initials name={guest.name} />
                          <div className="min-w-0">
                            <p className="font-semibold">{guest.name}</p>
                            <p className="text-xs text-ink/45">{guest.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p>{guest.email}</p>
                        <p className="text-xs text-ink/50">{guest.phone || '-'}</p>
                      </td>
                      <td className="px-5 py-4">{guest.category}</td>
                      <td className="px-5 py-4">
                        <StatusBadge invitation={guest.invitation} />
                      </td>
                    </tr>
                  ))}
                  {!filteredGuests.length && (
                    <tr>
                      <td className="px-6 py-10 text-center text-ink/55" colSpan="4">
                        {loading ? 'Loading guests...' : 'No guests found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="grid gap-4 md:grid-cols-2 2xl:block 2xl:space-y-4">
          <div className="rounded-lg border border-ink/15 bg-white p-5">
            <p className="eyebrow">Pending actions</p>
            <div className="mt-4 divide-y divide-ink/10">
              <ActionRow label="Send reminder emails" value={pendingCount} />
              <ActionRow label="Review failed delivery" value={failedCount} />
              <ActionRow label="Open QR scanner" value={stats?.checkedInCount ?? 0} />
            </div>
          </div>

          <div className="rounded-lg border border-ink/15 bg-white p-5">
            <p className="eyebrow">Latest</p>
            <div className="mt-4 space-y-3">
              {recentGuests.map((guest) => (
                <div key={guest.id} className="flex items-center gap-3">
                  <Initials name={guest.name} small />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{guest.name}</p>
                    <p className="text-xs text-ink/50">{getInvitationStatus(guest.invitation).label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function StatCard({ label, value, note, icon: Icon, active = false }) {
  return (
    <article className={`rounded-lg border border-ink/15 bg-white px-4 py-3.5 ${active ? 'border-l-4 border-l-ink' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/55">{label}</p>
        <Icon className="shrink-0 text-ink/40" size={16} />
      </div>
      <div className="mt-4 flex items-end justify-between gap-4 border-t border-ink/10 pt-3">
        <p className="font-display text-3xl leading-none">{value}</p>
        <p className="pb-0.5 text-right text-[10px] uppercase tracking-[0.14em] text-ink/50">{note}</p>
      </div>
    </article>
  );
}

function StatusBadge({ invitation }) {
  const status = getInvitationStatus(invitation);

  return (
    <div>
      <span className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${status.className}`}>
        {status.label}
      </span>
    </div>
  );
}

function Initials({ name = '', small = false }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <span className={`grid shrink-0 place-items-center rounded-full border border-ink/15 bg-linen font-display ${small ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'}`}>
      {initials || 'G'}
    </span>
  );
}

function ActionRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-ink/45">{value} records</p>
      </div>
      <ChevronRight className="shrink-0" size={16} />
    </div>
  );
}
