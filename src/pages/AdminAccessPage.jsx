import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, RefreshCcw, ShieldCheck, X } from 'lucide-react';
import { fetchRoleRequests, updateRoleRequest } from '../api/client.js';

const roleOptions = [
  { value: 'receptionist', label: 'Resepsionis' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' }
];

export default function AdminAccessPage() {
  const [requests, setRequests] = useState([]);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');

  async function loadRequests() {
    setLoading(true);
    try {
      const data = await fetchRoleRequests();
      setRequests(data);
      setRoleDrafts(Object.fromEntries(data.map((request) => [request.id, request.requestedRole || 'admin'])));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load access requests');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const pendingCount = useMemo(() => requests.filter((request) => normalizeStatus(request.status) === 'pending').length, [requests]);

  async function handleUpdate(request, status) {
    setSavingId(request.id);
    try {
      const updated = await updateRoleRequest(request.id, {
        status,
        role: roleDrafts[request.id] || request.requestedRole || 'admin'
      });

      setRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(status === 'success' ? 'Role berhasil di-approve' : 'Request ditolak');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update role request');
    } finally {
      setSavingId('');
    }
  }

  return (
    <section className="space-y-7">
      <div className="flex flex-col gap-5 border-b border-ink/15 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Access Control</p>
          <h1 className="mt-3 font-display text-4xl leading-none sm:text-5xl">Role Requests</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">
            Approve akun Google yang sudah request akses. Setelah approve, user perlu logout dan login ulang agar role aktif.
          </p>
        </div>
        <button className="button-secondary" onClick={loadRequests} disabled={loading}>
          <RefreshCcw size={18} />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AccessStat label="Pending" value={pendingCount} />
        <AccessStat label="Total Requests" value={requests.length} />
        <AccessStat label="Approved" value={requests.filter((request) => normalizeStatus(request.status) === 'success').length} />
      </div>

      <div className="overflow-hidden rounded-lg border border-ink/15 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-ink/15 bg-linen">
              <tr>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55">Google Account</th>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55">Requested Role</th>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55">Status</th>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55">Note</th>
                <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const status = normalizeStatus(request.status);
                return (
                  <tr key={request.id} className="border-t border-ink/10 align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold">{request.name || '-'}</p>
                      <p className="mt-1 text-xs text-ink/50">{request.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        className="field min-w-40"
                        value={roleDrafts[request.id] || request.requestedRole || 'admin'}
                        onChange={(event) => setRoleDrafts((current) => ({ ...current, [request.id]: event.target.value }))}
                        disabled={savingId === request.id}
                      >
                        {roleOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={status} />
                      <p className="mt-2 text-xs text-ink/45">{formatDate(request.updatedAt || request.createdAt)}</p>
                    </td>
                    <td className="max-w-xs px-5 py-4 text-ink/60">{request.message || '-'}</td>
                    <td className="px-5 py-4">
                      {status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button className="button-secondary" onClick={() => handleUpdate(request, 'rejected')} disabled={savingId === request.id}>
                            <X size={16} />
                            Reject
                          </button>
                          <button className="button-primary" onClick={() => handleUpdate(request, 'success')} disabled={savingId === request.id}>
                            <Check size={16} />
                            Approve
                          </button>
                        </div>
                      ) : (
                        <p className="text-right text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
                          {status === 'success' ? 'Approved' : 'Closed'}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!requests.length && (
                <tr>
                  <td className="px-6 py-12 text-center text-ink/55" colSpan="5">
                    {loading ? 'Loading access requests...' : 'Belum ada request role.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function AccessStat({ label, value }) {
  return (
    <article className="rounded-lg border border-ink/15 bg-white px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/55">{label}</p>
        <ShieldCheck className="text-ink/40" size={16} />
      </div>
      <p className="mt-4 border-t border-ink/10 pt-3 font-display text-3xl leading-none">{value}</p>
    </article>
  );
}

function StatusBadge({ status }) {
  const classes = {
    success: 'border-emerald-500/25 bg-emerald-50 text-emerald-800',
    rejected: 'border-rose-500/25 bg-rose-50 text-rose-800',
    pending: 'border-amber-500/25 bg-amber-50 text-amber-800'
  };

  const labels = {
    success: 'approved',
    rejected: 'rejected',
    pending: 'pending'
  };

  return (
    <span className={`inline-flex rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${classes[status] || classes.pending}`}>
      {labels[status] || status}
    </span>
  );
}

function normalizeStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (['success', 'succes', 'approved', 'accepted', 'active'].includes(value)) return 'success';
  if (['rejected', 'declined', 'denied'].includes(value)) return 'rejected';
  return 'pending';
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}
