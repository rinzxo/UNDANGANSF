import { v4 as uuidv4 } from 'uuid';

const validCategories = new Set(['VIP', 'Regular']);

export function createDemoDataStore() {
  const now = new Date().toISOString();
  const guestA = 'guest-demo-alya';
  const guestB = 'guest-demo-bima';
  const guestC = 'guest-demo-citra';
  const inviteA = 'demo-vip-alya';
  const inviteB = 'demo-regular-bima';
  const inviteC = 'demo-vip-citra';

  const guests = new Map([
    [guestA, {
      id: guestA,
      name: 'Alya Prameswari',
      email: 'alya@example.com',
      phone: '+628111111111',
      category: 'VIP',
      createdAt: now
    }],
    [guestB, {
      id: guestB,
      name: 'Bima Santoso',
      email: 'bima@example.com',
      phone: '+628122222222',
      category: 'Regular',
      createdAt: now
    }],
    [guestC, {
      id: guestC,
      name: 'Citra Lestari',
      email: 'citra@example.com',
      phone: '+628133333333',
      category: 'VIP',
      createdAt: now
    }]
  ]);

  const invitations = new Map([
    [inviteA, { id: inviteA, guestId: guestA, status: 'pending', qrCodeData: inviteA, tableNumber: 'A1' }],
    [inviteB, { id: inviteB, guestId: guestB, status: 'sent', qrCodeData: inviteB, tableNumber: 'B4', sentAt: now }],
    [inviteC, { id: inviteC, guestId: guestC, status: 'pending', qrCodeData: inviteC, tableNumber: 'A2' }]
  ]);

  const attendanceLogs = new Map();
  const roleRequests = new Map();
  let event = { ...DEFAULT_EVENT_SETTINGS };

  return {
    async createRoleRequest({ user, requestedRole = 'admin', message = '' }) {
      const email = String(user?.email || '').trim().toLowerCase();
      if (!email) {
        throw Object.assign(new Error('Google email is required'), { status: 400 });
      }

      const request = {
        id: email,
        email,
        name: user?.name || email,
        requestedRole: normalizeRequestedRole(requestedRole),
        message: String(message || '').trim(),
        status: 'pending',
        createdAt: roleRequests.get(email)?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        demoMode: true
      };

      roleRequests.set(email, request);
      return request;
    },

    async listRoleRequests() {
      return [...roleRequests.values()].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },

    async updateRoleRequest(requestId, { status = 'success', role = '', reviewer = null }) {
      const id = String(requestId || '').trim().toLowerCase();
      const request = roleRequests.get(id);
      if (!request) {
        throw Object.assign(new Error('Role request not found'), { status: 404 });
      }

      const updated = {
        ...request,
        requestedRole: normalizeRequestedRole(role || request.requestedRole),
        status: normalizeRequestStatus(status),
        reviewedBy: reviewer?.email || null,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      roleRequests.set(id, updated);
      return updated;
    },

    async registerGuest({ name, email = '', phone = '', category = 'Regular', tableNumber = null }) {
      const normalizedCategory = validCategories.has(category) ? category : 'Regular';
      const guestId = `guest-${uuidv4()}`;
      const invitationId = createUniqueInvitationSlug(name, invitations);
      const createdAt = new Date().toISOString();

      guests.set(guestId, {
        id: guestId,
        name,
        email,
        phone,
        category: normalizedCategory,
        createdAt
      });

      invitations.set(invitationId, {
        id: invitationId,
        guestId,
        status: 'pending',
        qrCodeData: invitationId,
        tableNumber
      });

      return {
        guestId,
        invitationId,
        invitationUrl: `${getFrontendUrl()}/invitation/${invitationId}`,
        demoMode: true
      };
    },

    async sendInvitations(invitationId) {
      const targets = invitationId
        ? [invitations.get(invitationId)].filter(Boolean)
        : [...invitations.values()].filter((invitation) => ['pending', 'failed'].includes(invitation.status));

      const results = targets.map((invitation) => {
        const guest = guests.get(invitation.guestId);

        if (!guest) {
          invitation.status = 'failed';
          invitation.emailError = 'Guest not found';
          return { invitationId: invitation.id, status: 'failed', error: 'Guest not found' };
        }

        invitation.status = 'sent';
        invitation.sentAt = new Date().toISOString();
        delete invitation.emailError;

        return {
          invitationId: invitation.id,
          email: guest.email,
          status: 'sent',
          demoMode: true
        };
      });

      if (invitationId && !targets.length) {
        results.push({ invitationId, status: 'failed', error: 'Invitation not found', demoMode: true });
      }

      return {
        sent: results.filter((result) => result.status === 'sent').length,
        failed: results.filter((result) => result.status === 'failed').length,
        results
      };
    },

    async scanCheckIn({ invitationId, type = 'auto' }) {
      const invitation = invitations.get(invitationId);

      if (!invitation) {
        throw Object.assign(new Error('Invitation not found'), { status: 404 });
      }

      const guest = guests.get(invitation.guestId) || null;

      if (invitation.status === 'checked-in' || invitation.checkedInAt) {
        throw Object.assign(new Error('Guest already checked in'), {
          status: 409,
          details: {
            code: 'ALREADY_CHECKED_IN',
            invitationId,
            checkedInAt: invitation.checkedInAt || null,
            guestName: guest?.name || null,
            guest,
            currentStatus: 'checked-in'
          }
        });
      }

      const attendanceLogId = `log-${uuidv4()}`;
      const checkedInAt = new Date().toISOString();
      const photoUrl = `https://placehold.co/900x600/211812/f6ecdc?text=Demo+Check-in+${encodeURIComponent(invitationId)}`;

      attendanceLogs.set(attendanceLogId, {
        id: attendanceLogId,
        invitationId,
        checkInTime: checkedInAt,
        photoUrl,
        type: type === 'manual' ? 'manual' : 'auto'
      });

      const previousStatus = invitation.status;
      invitation.status = 'checked-in';
      invitation.checkedInAt = checkedInAt;
      invitation.latestPhotoUrl = photoUrl;

      return {
        attendanceLogId,
        invitationId,
        photoUrl,
        checkedIn: true,
        guestName: guest?.name || null,
        guest,
        previousStatus,
        currentStatus: invitation.status,
        demoMode: true
      };
    },

    async getStats() {
      const guestList = [...guests.values()];
      const uniqueCheckedIn = new Set([...attendanceLogs.values()].map((log) => log.invitationId));

      return {
        totalGuests: guestList.length,
        vipGuests: guestList.filter((guest) => guest.category === 'VIP').length,
        regularGuests: guestList.filter((guest) => guest.category !== 'VIP').length,
        checkedInCount: uniqueCheckedIn.size,
        demoMode: true
      };
    },

    async getGuests() {
      const invitationsByGuestId = new Map();
      invitations.forEach((invitation) => {
        invitationsByGuestId.set(invitation.guestId, invitation);
      });

      return [...guests.values()]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((guest) => ({
          ...guest,
          invitation: invitationsByGuestId.get(guest.id) || null
        }));
    },

    async deleteGuest(guestId) {
      if (!guests.has(guestId)) {
        throw Object.assign(new Error('Guest not found'), { status: 404 });
      }

      const invitation = [...invitations.values()].find((item) => item.guestId === guestId);
      if (invitation) {
        invitations.delete(invitation.id);
        [...attendanceLogs.entries()].forEach(([logId, log]) => {
          if (log.invitationId === invitation.id) {
            attendanceLogs.delete(logId);
          }
        });
      }

      guests.delete(guestId);

      return {
        deleted: true,
        guestId,
        invitationId: invitation?.id || null,
        demoMode: true
      };
    },

    async getEventSettings() {
      return event;
    },

    async updateEventSettings(payload) {
      event = {
        ...event,
        ...sanitizeEventSettings(payload),
        updatedAt: new Date().toISOString()
      };

      return event;
    },

    async getInvitation(invitationId) {
      const invitation = resolveInvitation(invitationId, guests, invitations);

      if (!invitation) {
        throw Object.assign(new Error('Invitation not found'), { status: 404 });
      }

      return {
        invitation,
        guest: guests.get(invitation.guestId) || null,
        event,
        demoMode: true
      };
    },

    async updateInvitationRsvp(invitationId, { attendance, partySize }) {
      const invitation = resolveInvitation(invitationId, guests, invitations);

      if (!invitation) {
        throw Object.assign(new Error('Invitation not found'), { status: 404 });
      }

      const guest = guests.get(invitation.guestId) || null;
      const rsvp = normalizeRsvp({ attendance, partySize, guest });
      invitation.rsvp = rsvp;
      invitation.rsvpConfirmedAt = rsvp.confirmedAt;

      return {
        invitation,
        guest,
        rsvp,
        demoMode: true
      };
    }
  };
}

const DEFAULT_EVENT_SETTINGS = {
  title: 'The Wedding Celebration',
  partnerOneName: 'Alya',
  partnerTwoName: 'Bima',
  partnerOneParentLine: '',
  partnerTwoParentLine: '',
  date: '2026-08-08T10:00:00.000+07:00',
  location: 'The Glass House, Jakarta',
  coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552',
  heroImagePosition: 'center',
  heroPhotoStripImages: [],
  description: 'A warm, elegant gathering to celebrate love, family, and friendship.',
  heroEyebrow: 'We Invite You to join our wedding',
  storyTitle: '',
  storyBody: 'What begins as a quiet promise becomes a day held by family, friendship, and every small detail that made the journey unforgettable.',
  countdownIntroLabel: 'Menuju Hari Bahagia',
  dateFallbackLabel: 'Tanggal acara akan segera diumumkan',
  locationFallbackLabel: 'Lokasi acara akan segera diumumkan',
  scheduleTitle: 'Selasa / 02.06.2026',
  ceremonyTitle: 'Akad',
  ceremonyDate: 'Selasa, 02 Juni 2026',
  ceremonyTime: 'Pukul : 13.00',
  ceremonyVenue: 'KUA Kec. Tanah Abang',
  ceremonyAddress: 'Jl. Mutiara No.2A 17, RT.17/RW.5, Karet Tengsin, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10220',
  receptionTitle: 'Resepsi',
  receptionDate: 'Selasa, 02 Juni 2026',
  receptionTime: 'Pukul : 16.00 - 20.00',
  receptionVenue: 'Oemah Lesmana Resto & Venue',
  receptionAddress: 'Jl. Karang Tengah Raya No.37, RT/RW:06/RW.3, Lb. Bulus, Kec. Cilandak, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12440',
  loveStoryTitle: 'Our Journey',
  loveStoryScenes: [
    {
      label: 'First Meet',
      title: 'Awal Bertemu',
      body: 'Sebuah pertemuan sederhana yang perlahan menjadi cerita yang ingin terus dijaga.',
      image: ''
    },
    {
      label: 'Closer',
      title: 'Semakin Dekat',
      body: 'Dari percakapan kecil, tumbuh rasa saling mengenal, saling percaya, dan saling pulang.',
      image: ''
    },
    {
      label: 'The Promise',
      title: 'Sebuah Janji',
      body: 'Di antara keluarga dan doa-doa baik, keduanya memilih melangkah bersama.',
      image: ''
    }
  ],
  recipientLabel: 'Kepada Yth.',
  guestNameFallback: 'Nama Tamu',
  daysLabel: 'Days',
  hoursLabel: 'Hours',
  minutesLabel: 'Mins',
  secondsLabel: 'Secs',
  galleryTitle: 'Our Moments',
  galleryImages: [
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=600&q=80'
  ],
  passEyebrow: 'Guest pass',
  passTitle: 'Please present this QR at reception.',
  categoryLabel: 'Category',
  tableLabel: 'Table',
  passIdLabel: 'Pass ID',
  downloadQrLabel: 'Download QR',
  giftTitle: 'Wedding Gift',
  giftDescription: 'Doa restu Anda adalah hadiah terindah. Jika berkenan, tanda kasih dapat dikirim melalui QRIS atau rekening berikut.',
  giftQrisImage: '',
  giftQrisLabel: 'QRIS Wedding Gift',
  giftBankAccounts: [],
  musicTitle: 'Wedding Film Score',
  musicUrl: '',
  footerCopyright: '\u00a9 2026 The Wedding Collective'
};

const allowedEventSettingKeys = [
  'title',
  'partnerOneName',
  'partnerTwoName',
  'partnerOneParentLine',
  'partnerTwoParentLine',
  'date',
  'location',
  'coverImage',
  'heroImagePosition',
  'heroPhotoStripImages',
  'description',
  'heroEyebrow',
  'storyTitle',
  'storyBody',
  'countdownIntroLabel',
  'dateFallbackLabel',
  'locationFallbackLabel',
  'scheduleTitle',
  'ceremonyTitle',
  'ceremonyDate',
  'ceremonyTime',
  'ceremonyVenue',
  'ceremonyAddress',
  'receptionTitle',
  'receptionDate',
  'receptionTime',
  'receptionVenue',
  'receptionAddress',
  'loveStoryTitle',
  'loveStoryScenes',
  'recipientLabel',
  'guestNameFallback',
  'daysLabel',
  'hoursLabel',
  'minutesLabel',
  'secondsLabel',
  'galleryTitle',
  'galleryImages',
  'passEyebrow',
  'passTitle',
  'categoryLabel',
  'tableLabel',
  'passIdLabel',
  'downloadQrLabel',
  'giftTitle',
  'giftDescription',
  'giftQrisImage',
  'giftQrisLabel',
  'giftBankAccounts',
  'musicTitle',
  'musicUrl',
  'footerCopyright'
];

function sanitizeEventSettings(payload = {}) {
  return allowedEventSettingKeys.reduce((settings, key) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      settings[key] = sanitizeEventSettingValue(payload[key], key);
    }

    return settings;
  }, {});
}

function sanitizeEventSettingValue(value, key) {
  if (key === 'loveStoryScenes') {
    return sanitizeLoveStoryScenes(value);
  }

  if (key === 'giftBankAccounts') {
    return sanitizeGiftBankAccounts(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => String(item || '').trim()).filter(Boolean);
    return key === 'heroPhotoStripImages' ? items.slice(0, 3) : items;
  }

  return typeof value === 'string' ? value.trim() : value;
}

function sanitizeGiftBankAccounts(value) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 6).map((account) => ({
    bankName: String(account?.bankName || '').trim(),
    accountNumber: String(account?.accountNumber || '').trim(),
    accountName: String(account?.accountName || '').trim()
  })).filter((account) => account.bankName || account.accountNumber || account.accountName);
}

function sanitizeLoveStoryScenes(value) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 3).map((scene) => ({
    label: String(scene?.label || '').trim(),
    title: String(scene?.title || '').trim(),
    body: String(scene?.body || '').trim(),
    image: String(scene?.image || '').trim()
  }));
}

function normalizeRequestedRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (['receptionist', 'admin', 'super_admin'].includes(value)) return value;
  if (value === 'resepsionis') return 'receptionist';
  if (value === 'superadmin' || value === 'super-admin') return 'super_admin';
  return 'admin';
}

function normalizeRequestStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (['rejected', 'declined', 'denied'].includes(value)) return 'rejected';
  if (['success', 'succes', 'approved', 'accepted', 'active'].includes(value)) return 'success';
  return 'pending';
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

function createUniqueInvitationSlug(name, invitations) {
  const baseSlug = slugifyName(name) || 'guest';
  let slug = `${baseSlug}-${createShortId()}`;

  while (invitations.has(slug)) {
    slug = `${baseSlug}-${createShortId()}`;
  }

  return slug;
}

function createShortId() {
  return uuidv4().split('-').at(0);
}

function resolveInvitation(invitationId, _guests, invitations) {
  return invitations.get(invitationId) || null;
}

function normalizeRsvp({ attendance, partySize, guest }) {
  const normalizedAttendance = attendance === 'declined' ? 'declined' : 'attending';
  const normalizedPartySize = normalizedAttendance === 'declined'
    ? 0
    : Math.min(20, Math.max(1, Number.parseInt(partySize, 10) || 1));

  return {
    attendance: normalizedAttendance,
    partySize: normalizedPartySize,
    guestName: guest?.name || '',
    confirmedAt: new Date().toISOString()
  };
}

function slugifyName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
