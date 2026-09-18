import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, ChevronLeft, ChevronRight, Copy, Mail, Phone, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { createGuest, deleteGuest, fetchGuests } from '../api/client.js';
import { getInvitationStatus } from '../utils/invitationStatus.js';
import { useAuth } from '../auth/AuthContext.jsx';

const categoryOptions = ['All', 'VIP', 'Regular'];

export default function AdminGuestsPage() {
  const { canManageGuests } = useAuth();
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createdInvitationUrl, setCreatedInvitationUrl] = useState('');
  const [copiedUrl, setCopiedUrl] = useState('');
  const [deletingGuestId, setDeletingGuestId] = useState('');
  const [guestPendingDelete, setGuestPendingDelete] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'Regular'
  });

  async function loadGuests() {
    setLoading(true);
    try {
      setGuests(await fetchGuests());
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load guests');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGuests();
  }, []);

  async function handleCreateGuest(event) {
    event.preventDefault();

    if (!canManageGuests) {
      toast.error('Role resepsionis tidak bisa menambah guest');
      return;
    }

    if (!form.name.trim()) {
      toast.error('Guest name is required');
      return;
    }

    setCreating(true);
    try {
      const result = await createGuest({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        category: form.category
      });

      setCreatedInvitationUrl(result.invitationUrl);
      toast.success('Guest added');
      await loadGuests();
      setForm({ name: '', email: '', phone: '', category: 'Regular' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add guest');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteGuest(guest) {
    if (!canManageGuests) {
      toast.error('Role resepsionis tidak bisa menghapus guest');
      return;
    }

    setGuestPendingDelete(guest);
  }

  async function confirmDeleteGuest() {
    if (!guestPendingDelete) return;
    if (!canManageGuests) return;

    setDeletingGuestId(guestPendingDelete.id);
    try {
      await deleteGuest(guestPendingDelete.id);
      toast.success('Guest deleted');
      setGuestPendingDelete(null);
      await loadGuests();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete guest');
    } finally {
      setDeletingGuestId('');
    }
  }

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
  const rsvpStats = useMemo(() => getRsvpStats(guests), [guests]);

  return (
    <section className="space-y-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-4xl leading-none sm:text-5xl">Guest List</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-ink/70">
            Manage invitations, track RSVP status, and organize attendees for the celebration.
          </p>
        </div>
        {canManageGuests && (
          <button className="button-primary w-full sm:w-auto" onClick={() => setShowCreateForm(true)}>
            <Plus size={16} />
            Add Guest
          </button>
        )}
      </div>

      {showCreateForm && canManageGuests && (
        <div className="rounded-lg border border-ink/15 bg-white p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Create invitation link</p>
              <p className="mt-2 text-sm text-ink/60">Add a guest, then copy their personal invitation URL.</p>
            </div>
            <button
              className="rounded-md border border-ink/15 p-2 transition hover:border-ink"
              onClick={() => setShowCreateForm(false)}
              aria-label="Close add guest form"
            >
              <X size={16} />
            </button>
          </div>

          <form className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(180px,0.8fr)_150px_140px]" onSubmit={handleCreateGuest}>
            <input
              className="field"
              placeholder="Guest name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              className="field"
              placeholder="Email optional"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
            <input
              className="field"
              placeholder="Phone"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
            <select
              className="field"
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            >
              <option>Regular</option>
              <option>VIP</option>
            </select>
            <button className="button-primary lg:col-span-4" disabled={creating}>
              {creating ? 'Creating' : 'Create & Generate Link'}
            </button>
          </form>

          {createdInvitationUrl && (
            <CopyLinkPanel
              className="mt-5"
              url={createdInvitationUrl}
              copied={copiedUrl === createdInvitationUrl}
              onCopy={() => copyInvitationUrl(createdInvitationUrl, setCopiedUrl)}
            />
          )}
        </div>
      )}

      <div className="rounded-lg border border-ink/15 bg-white p-5">
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <RsvpSummaryCard label="RSVP Hadir" value={rsvpStats.attendingInvitations} note={`${rsvpStats.attendingPeople} orang hadir`} />
          <RsvpSummaryCard label="Berhalangan" value={rsvpStats.declinedInvitations} note="undangan terkonfirmasi" />
          <RsvpSummaryCard label="Belum RSVP" value={rsvpStats.pendingInvitations} note="menunggu jawaban" />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_160px_160px]">
          <label className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/55" size={17} />
            <input
              className="field field-icon-left min-w-0"
              placeholder="Search guests by name, email, or phone..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select className="field" value={category} onChange={(event) => setCategory(event.target.value)}>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>{option === 'All' ? 'All Groups' : option}</option>
            ))}
          </select>
          <select className="field" defaultValue="Any Status">
            <option>Any Status</option>
            <option>Pending</option>
            <option>Checked-in</option>
            <option>Failed</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 lg:hidden">
        {filteredGuests.map((guest) => {
          const status = getInvitationStatus(guest.invitation);
          const invitationUrl = getInvitationUrl(guest);

          return (
            <GuestMobileCard
              key={guest.id}
              guest={guest}
              status={status}
              invitationUrl={invitationUrl}
              copied={copiedUrl === invitationUrl}
              deleting={deletingGuestId === guest.id}
              canDelete={canManageGuests}
              onCopy={() => copyInvitationUrl(invitationUrl, setCopiedUrl)}
              onDelete={() => handleDeleteGuest(guest)}
            />
          );
        })}
        {!filteredGuests.length && (
          <div className="rounded-lg border border-ink/15 bg-white px-5 py-10 text-center text-ink/55">
            {loading ? 'Loading guests...' : 'No guests found.'}
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-ink/15 bg-white lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] text-left text-sm">
            <thead className="border-b border-ink/15 bg-linen">
              <tr>
                <th className="w-11 px-4 py-4">
                  <span className="block h-4 w-4 rounded-sm border border-ink/20" />
                </th>
                <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.17em] text-ink/55">Guest Name</th>
                <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.17em] text-ink/55">Contact</th>
                <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.17em] text-ink/55">Group</th>
                <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.17em] text-ink/55">Status</th>
                <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.17em] text-ink/55">RSVP</th>
                <th className="px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.17em] text-ink/55">Invitation Link</th>
                {canManageGuests && <th className="w-16 px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.17em] text-ink/55">Delete</th>}
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest) => {
                const status = getInvitationStatus(guest.invitation);
                const rsvp = getRsvpDisplay(guest.invitation);

                return (
                  <tr key={guest.id} className="border-b border-ink/10 last:border-b-0">
                    <td className="px-4 py-5">
                      <span className="block h-4 w-4 rounded-sm border border-ink/20" />
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-3">
                        <Initials name={guest.name} />
                        <div className="min-w-0">
                          <p className="max-w-[190px] break-words font-semibold leading-6">{guest.name}</p>
                          <p className="mt-0.5 break-all text-[11px] uppercase tracking-[0.14em] text-ink/45">{getInvitationPath(guest)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      {guest.email && (
                        <p className="flex min-w-0 items-center gap-2">
                          <Mail className="shrink-0" size={15} />
                          <span className="truncate">{guest.email}</span>
                        </p>
                      )}
                      <p className="mt-1.5 flex min-w-0 items-center gap-2 text-xs text-ink/55">
                        <Phone className="shrink-0" size={14} />
                        <span className="truncate">{guest.phone || '--'}</span>
                      </p>
                    </td>
                    <td className="px-4 py-5">{guest.category}</td>
                    <td className="px-4 py-5">
                      <span className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${status.className}`}>
                        {status.label}
                      </span>
                      <p className="mt-1.5 max-w-[160px] text-xs leading-5 text-ink/45">{status.description}</p>
                    </td>
                    <td className="px-4 py-5">
                      <RsvpBadge rsvp={rsvp} />
                    </td>
                    <td className="px-4 py-5 text-right">
                      <button
                        className="inline-flex items-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition hover:border-ink"
                        onClick={() => copyInvitationUrl(getInvitationUrl(guest), setCopiedUrl)}
                      >
                        {copiedUrl === getInvitationUrl(guest) ? <Check size={14} /> : <Copy size={14} />}
                        Copy
                      </button>
                    </td>
                    {canManageGuests && (
                      <td className="px-4 py-5 text-right">
                        <button
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink/15 text-ink/60 transition hover:border-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => handleDeleteGuest(guest)}
                          disabled={deletingGuestId === guest.id}
                          aria-label={`Delete ${guest.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {!filteredGuests.length && (
                <tr>
                  <td className="px-6 py-12 text-center text-ink/55" colSpan={canManageGuests ? 8 : 7}>
                    {loading ? 'Loading guests...' : 'No guests found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-ink/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/70">
          Showing {filteredGuests.length ? `1-${filteredGuests.length}` : '0'} of {guests.length}
        </p>
        <div className="flex items-center gap-3">
          <button className="button-secondary text-ink/40" disabled>
            <ChevronLeft size={18} />
            Prev
          </button>
          <button className="button-secondary">
            Next
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {guestPendingDelete && canManageGuests && (
        <ConfirmDeleteDialog
          guest={guestPendingDelete}
          loading={deletingGuestId === guestPendingDelete.id}
          onCancel={() => setGuestPendingDelete(null)}
          onConfirm={confirmDeleteGuest}
        />
      )}
    </section>
  );
}

function ConfirmDeleteDialog({ guest, loading, onCancel, onConfirm }) {
  return (
    <div className="app-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-guest-title">
      <div className="app-dialog-card">
        <p className="eyebrow">Konfirmasi</p>
        <h2 id="delete-guest-title" className="mt-3 font-display text-3xl leading-tight">
          Hapus tamu ini?
        </h2>
        <p className="mt-4 text-sm leading-6 text-ink/62">
          Guest <span className="font-semibold text-ink">{guest.name}</span> dan link undangannya akan dihapus dari daftar.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="button-secondary" onClick={onCancel} disabled={loading}>
            Batal
          </button>
          <button type="button" className="button-primary" onClick={onConfirm} disabled={loading}>
            {loading ? 'Menghapus...' : 'Hapus Guest'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GuestMobileCard({ guest, status, invitationUrl, copied, deleting, canDelete, onCopy, onDelete }) {
  const rsvp = getRsvpDisplay(guest.invitation);

  return (
    <article className="rounded-lg border border-ink/15 bg-white p-4 shadow-glow">
      <div className="flex items-start gap-3">
        <Initials name={guest.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
            <div className="min-w-0">
              <p className="break-words font-semibold leading-6">{guest.name}</p>
              <p className="mt-1 break-all text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/42">
                {getInvitationPath(guest)}
              </p>
            </div>
            <span className={`inline-flex w-fit shrink-0 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${status.className}`}>
              {status.label}
            </span>
          </div>

          <div className="mt-4 grid gap-2 text-xs text-ink/58">
            {guest.email && (
              <p className="flex min-w-0 items-center gap-2">
                <Mail className="shrink-0" size={14} />
                <span className="min-w-0 break-all">{guest.email}</span>
              </p>
            )}
            <p className="flex min-w-0 items-center gap-2">
              <Phone className="shrink-0" size={14} />
              <span className="min-w-0 break-all">{guest.phone || '--'}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-md border border-ink/10 bg-linen p-3">
        <div className="grid grid-cols-[88px_1fr] gap-3 text-xs leading-5">
          <span className="font-bold uppercase tracking-[0.14em] text-ink/38">Group</span>
          <span className="font-semibold text-ink/70">{guest.category}</span>
          <span className="font-bold uppercase tracking-[0.14em] text-ink/38">Status</span>
          <span className="text-ink/62">{status.description}</span>
          <span className="font-bold uppercase tracking-[0.14em] text-ink/38">RSVP</span>
          <span className="text-ink/62">{rsvp.summary}</span>
        </div>
      </div>

      <div className={`mt-4 grid gap-2 ${canDelete ? 'grid-cols-[1fr_auto]' : 'grid-cols-1'}`}>
        <button
          className="button-secondary min-w-0 px-3"
          onClick={onCopy}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy Link'}
        </button>
        {canDelete && (
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-ink/15 text-ink/60 transition hover:border-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={onDelete}
            disabled={deleting}
            aria-label={`Delete ${guest.name}`}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <input className="field mt-3 font-mono text-[11px]" value={invitationUrl} readOnly />
    </article>
  );
}

function RsvpSummaryCard({ label, value, note }) {
  return (
    <div className="rounded-md border border-ink/10 bg-linen p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink/45">{label}</p>
        <Users className="shrink-0 text-ink/35" size={16} />
      </div>
      <p className="mt-3 font-display text-3xl leading-none">{value}</p>
      <p className="mt-2 text-xs font-semibold text-ink/52">{note}</p>
    </div>
  );
}

function RsvpBadge({ rsvp }) {
  return (
    <div className="min-w-[130px]">
      <span className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${rsvp.className}`}>
        {rsvp.label}
      </span>
      <p className="mt-1.5 text-xs leading-5 text-ink/48">{rsvp.summary}</p>
    </div>
  );
}

function CopyLinkPanel({ url, copied, onCopy, className = '' }) {
  return (
    <div className={`rounded-md border border-ink/15 bg-linen p-4 ${className}`}>
      <p className="eyebrow">Invitation URL</p>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
        <input className="field font-mono text-xs" value={url} readOnly />
        <button className="button-secondary" onClick={onCopy}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? 'Copied' : 'Copy Link'}
        </button>
      </div>
    </div>
  );
}

async function copyInvitationUrl(url, setCopiedUrl) {
  try {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast.success('Invitation link copied');
    window.setTimeout(() => setCopiedUrl(''), 1800);
  } catch {
    toast.error('Failed to copy link');
  }
}

function getInvitationUrl(guest) {
  return `${window.location.origin}${getInvitationPath(guest)}`;
}

function getInvitationPath(guest) {
  return `/invitation/${guest.invitation?.id || ''}`;
}

function getRsvpDisplay(invitation) {
  const rsvp = invitation?.rsvp;

  if (!rsvp) {
    return {
      label: 'Belum RSVP',
      summary: 'Belum ada konfirmasi',
      className: 'bg-clay/10 text-clay'
    };
  }

  if (rsvp.attendance === 'declined') {
    return {
      label: 'Berhalangan',
      summary: 'Tidak hadir',
      className: 'bg-red-100 text-red-700'
    };
  }

  const partySize = Math.max(1, Number.parseInt(rsvp.partySize, 10) || 1);

  return {
    label: 'Hadir',
    summary: `${partySize} orang lewat undangan ini`,
    className: 'bg-moss text-white'
  };
}

function getRsvpStats(guests) {
  return guests.reduce((stats, guest) => {
    const rsvp = guest.invitation?.rsvp;

    if (!rsvp) {
      stats.pendingInvitations += 1;
      return stats;
    }

    if (rsvp.attendance === 'declined') {
      stats.declinedInvitations += 1;
      return stats;
    }

    stats.attendingInvitations += 1;
    stats.attendingPeople += Math.max(1, Number.parseInt(rsvp.partySize, 10) || 1);
    return stats;
  }, {
    attendingInvitations: 0,
    attendingPeople: 0,
    declinedInvitations: 0,
    pendingInvitations: 0
  });
}

function Initials({ name = '' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/15 bg-champagne font-display text-sm">
      {initials || 'G'}
    </span>
  );
}
