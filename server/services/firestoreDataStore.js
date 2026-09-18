import { v4 as uuidv4 } from 'uuid';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from './firebase.js';
import { uploadBase64Image } from './cloudinary.js';

const validCategories = new Set(['VIP', 'Regular']);

export function createFirestoreDataStore() {
  return {
    async createRoleRequest({ user, requestedRole = 'admin', message = '' }) {
      const email = String(user?.email || '').trim().toLowerCase();
      if (!email) {
        throw Object.assign(new Error('Google email is required'), { status: 400 });
      }

      const requestRef = db.collection('role_requests').doc(email.replace(/\//g, '_'));
      const existingSnap = await requestRef.get();
      const request = {
        email,
        name: user?.name || email,
        requestedRole: normalizeRequestedRole(requestedRole),
        message: String(message || '').trim(),
        status: 'pending',
        updatedAt: FieldValue.serverTimestamp()
      };

      if (!existingSnap.exists) {
        request.createdAt = FieldValue.serverTimestamp();
      }

      await requestRef.set(request, { merge: true });
      const savedSnap = await requestRef.get();

      return {
        id: savedSnap.id,
        ...serializeRoleRequest(savedSnap.data())
      };
    },

    async listRoleRequests() {
      const snapshot = await db.collection('role_requests').get();
      return snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...serializeRoleRequest(doc.data())
        }))
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    },

    async updateRoleRequest(requestId, { status = 'success', role = '', reviewer = null }) {
      const requestRef = db.collection('role_requests').doc(safeFirestoreId(requestId));
      const requestSnap = await requestRef.get();

      if (!requestSnap.exists) {
        throw Object.assign(new Error('Role request not found'), { status: 404 });
      }

      const request = requestSnap.data();
      const email = String(request.email || requestId || '').trim().toLowerCase();
      const requestedRole = normalizeRequestedRole(role || request.requestedRole);
      const normalizedStatus = normalizeRequestStatus(status);
      const now = FieldValue.serverTimestamp();

      const updates = {
        requestedRole,
        status: normalizedStatus,
        reviewedBy: reviewer?.email || null,
        reviewedAt: now,
        updatedAt: now
      };

      const batch = db.batch();
      batch.set(requestRef, updates, { merge: true });

      if (normalizedStatus === 'success') {
        batch.set(db.collection('admin_users').doc(safeFirestoreId(email)), {
          email,
          name: request.name || email,
          role: requestedRole,
          status: 'active',
          source: 'role_request',
          updatedAt: now,
          createdAt: request.createdAt || now
        }, { merge: true });
      }

      await batch.commit();
      const savedSnap = await requestRef.get();

      return {
        id: savedSnap.id,
        ...serializeRoleRequest(savedSnap.data())
      };
    },

    async registerGuest({ name, email = '', phone = '', category = 'Regular', tableNumber = null }) {
      const normalizedCategory = validCategories.has(category) ? category : 'Regular';
      const invitationId = await createUniqueInvitationSlug(name);
      const guestRef = db.collection('guests').doc();
      const invitationRef = db.collection('invitations').doc(invitationId);
      const invitationUrl = `${getFrontendUrl()}/invitation/${invitationId}`;

      const batch = db.batch();
      batch.set(guestRef, {
        name,
        email,
        phone,
        category: normalizedCategory,
        invitationSlug: invitationId,
        createdAt: FieldValue.serverTimestamp()
      });
      batch.set(invitationRef, {
        guestId: guestRef.id,
        status: 'pending',
        qrCodeData: invitationId,
        invitationSlug: invitationId,
        tableNumber
      });
      await batch.commit();

      return {
        guestId: guestRef.id,
        invitationId,
        invitationUrl
      };
    },

    async sendInvitations(invitationId) {
      if (invitationId) {
        const result = await sendOneInvitation(invitationId);
        return {
          sent: result.status === 'sent' ? 1 : 0,
          failed: result.status === 'failed' ? 1 : 0,
          results: [result]
        };
      }

      const pendingSnapshot = await db
        .collection('invitations')
        .where('status', 'in', ['pending', 'failed'])
        .get();

      const results = await Promise.all(
        pendingSnapshot.docs.map((doc) => sendOneInvitation(doc.id))
      );

      return {
        sent: results.filter((result) => result.status === 'sent').length,
        failed: results.filter((result) => result.status === 'failed').length,
        results
      };
    },

    async scanCheckIn({ invitationId, imageBase64, type = 'auto' }) {
      const invitationSnap = await resolveInvitationSnapshot(invitationId);

      if (!invitationSnap.exists) {
        throw Object.assign(new Error('Invitation not found'), { status: 404 });
      }

      const invitation = invitationSnap.data();
      const guestSnap = await db.collection('guests').doc(invitation.guestId).get();
      const guest = guestSnap.exists ? { id: guestSnap.id, ...guestSnap.data() } : null;

      if (invitation.status === 'checked-in' || invitation.checkedInAt) {
        throw Object.assign(new Error('Guest already checked in'), {
          status: 409,
          details: {
            code: 'ALREADY_CHECKED_IN',
            invitationId: invitationSnap.id,
            checkedInAt: serializeTimestamp(invitation.checkedInAt),
            guestName: guest?.name || null,
            guest,
            currentStatus: 'checked-in'
          }
        });
      }

      const upload = await uploadBase64Image(imageBase64, invitationSnap.id);
      const logRef = db.collection('attendance_logs').doc();
      const checkInTime = FieldValue.serverTimestamp();

      await db.runTransaction(async (transaction) => {
        const freshInvitationSnap = await transaction.get(invitationSnap.ref);
        const freshInvitation = freshInvitationSnap.data();

        if (freshInvitation?.status === 'checked-in' || freshInvitation?.checkedInAt) {
          throw Object.assign(new Error('Guest already checked in'), {
            status: 409,
            details: {
              code: 'ALREADY_CHECKED_IN',
              invitationId: invitationSnap.id,
              checkedInAt: serializeTimestamp(freshInvitation.checkedInAt),
              guestName: guest?.name || null,
              guest,
              currentStatus: 'checked-in'
            }
          });
        }

        transaction.set(logRef, {
          invitationId: invitationSnap.id,
          checkInTime,
          photoUrl: upload.secure_url,
          type: type === 'manual' ? 'manual' : 'auto'
        });
        transaction.update(invitationSnap.ref, {
          status: 'checked-in',
          checkedInAt: checkInTime,
          latestPhotoUrl: upload.secure_url
        });
      });

      return {
        attendanceLogId: logRef.id,
        invitationId: invitationSnap.id,
        photoUrl: upload.secure_url,
        checkedIn: true,
        guestName: guest?.name || null,
        guest,
        previousStatus: invitation.status,
        currentStatus: 'checked-in'
      };
    },

    async getStats() {
      const [guestsSnapshot, logsSnapshot] = await Promise.all([
        db.collection('guests').get(),
        db.collection('attendance_logs').get()
      ]);

      const totalGuests = guestsSnapshot.size;
      let vipGuests = 0;
      let regularGuests = 0;

      guestsSnapshot.forEach((doc) => {
        if (doc.data().category === 'VIP') {
          vipGuests += 1;
        } else {
          regularGuests += 1;
        }
      });

      const uniqueCheckedIn = new Set();
      logsSnapshot.forEach((doc) => {
        const { invitationId } = doc.data();
        if (invitationId) uniqueCheckedIn.add(invitationId);
      });

      return {
        totalGuests,
        vipGuests,
        regularGuests,
        checkedInCount: uniqueCheckedIn.size
      };
    },

    async getGuests() {
      const [guestsSnapshot, invitationsSnapshot] = await Promise.all([
        db.collection('guests').orderBy('createdAt', 'desc').get(),
        db.collection('invitations').get()
      ]);

      const invitationsByGuestId = new Map();
      invitationsSnapshot.forEach((doc) => {
        invitationsByGuestId.set(doc.data().guestId, { id: doc.id, ...doc.data() });
      });

      return guestsSnapshot.docs.map((doc) => {
        const guest = doc.data();
        return {
          id: doc.id,
          ...guest,
          createdAt: serializeTimestamp(guest.createdAt),
          invitation: serializeInvitation(invitationsByGuestId.get(doc.id))
        };
      });
    },

    async deleteGuest(guestId) {
      const guestRef = db.collection('guests').doc(guestId);
      const guestSnap = await guestRef.get();

      if (!guestSnap.exists) {
        throw Object.assign(new Error('Guest not found'), { status: 404 });
      }

      const invitationsSnapshot = await db
        .collection('invitations')
        .where('guestId', '==', guestId)
        .get();

      const invitationIds = invitationsSnapshot.docs.map((doc) => doc.id);
      const batch = db.batch();
      batch.delete(guestRef);

      invitationsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      for (const invitationId of invitationIds) {
        const logsSnapshot = await db
          .collection('attendance_logs')
          .where('invitationId', '==', invitationId)
          .get();

        logsSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
      }

      await batch.commit();

      return {
        deleted: true,
        guestId,
        invitationIds
      };
    },

    async getEventSettings() {
      const eventSnap = await db.collection('event_settings').doc('main').get();
      return eventSnap.exists ? serializeEvent(eventSnap.data()) : getDefaultEventSettings();
    },

    async updateEventSettings(payload) {
      const eventRef = db.collection('event_settings').doc('main');
      const updates = {
        ...sanitizeEventSettings(payload),
        updatedAt: FieldValue.serverTimestamp()
      };

      await eventRef.set(updates, { merge: true });
      const eventSnap = await eventRef.get();
      return eventSnap.exists ? serializeEvent(eventSnap.data()) : getDefaultEventSettings();
    },

    async getInvitation(invitationId) {
      const invitationSnap = await resolveInvitationSnapshot(invitationId);

      if (!invitationSnap.exists) {
        throw Object.assign(new Error('Invitation not found'), { status: 404 });
      }

      const invitation = invitationSnap.data();
      const [guestSnap, eventSnap] = await Promise.all([
        db.collection('guests').doc(invitation.guestId).get(),
        db.collection('event_settings').doc('main').get()
      ]);

      return {
        invitation: {
          id: invitationSnap.id,
          ...serializeInvitation(invitation)
        },
        guest: guestSnap.exists ? { id: guestSnap.id, ...guestSnap.data() } : null,
        event: eventSnap.exists ? serializeEvent(eventSnap.data()) : null
      };
    },

    async updateInvitationRsvp(invitationId, { attendance, partySize }) {
      const invitationSnap = await resolveInvitationSnapshot(invitationId);

      if (!invitationSnap.exists) {
        throw Object.assign(new Error('Invitation not found'), { status: 404 });
      }

      const invitation = invitationSnap.data();
      const guestSnap = await db.collection('guests').doc(invitation.guestId).get();
      const guest = guestSnap.exists ? { id: guestSnap.id, ...guestSnap.data() } : null;
      const rsvp = normalizeRsvp({
        attendance,
        partySize,
        guest,
        confirmedAt: FieldValue.serverTimestamp()
      });

      await invitationSnap.ref.set({
        rsvp,
        rsvpConfirmedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      const savedInvitationSnap = await invitationSnap.ref.get();
      const savedInvitation = {
        id: savedInvitationSnap.id,
        ...serializeInvitation(savedInvitationSnap.data())
      };

      return {
        invitation: savedInvitation,
        guest,
        rsvp: savedInvitation.rsvp
      };
    }
  };
}

async function sendOneInvitation(invitationId) {
  const invitationRef = db.collection('invitations').doc(invitationId);
  const invitationSnap = await invitationRef.get();

  if (!invitationSnap.exists) {
    return { invitationId, status: 'failed', error: 'Invitation not found' };
  }

  const invitation = invitationSnap.data();
  const guestSnap = await db.collection('guests').doc(invitation.guestId).get();

  if (!guestSnap.exists) {
    await invitationRef.update({ status: 'failed', emailError: 'Guest not found' });
    return { invitationId, status: 'failed', error: 'Guest not found' };
  }

  const guest = guestSnap.data();
  const invitationUrl = `${getFrontendUrl()}/invitation/${invitationId}`;

  await invitationRef.update({
    status: 'sent',
    sentAt: FieldValue.serverTimestamp(),
    emailError: FieldValue.delete()
  });

  return { invitationId, email: guest.email, invitationUrl, status: 'sent' };
}

async function resolveInvitationSnapshot(invitationId) {
  const directSnap = await db.collection('invitations').doc(invitationId).get();
  if (directSnap.exists) return directSnap;

  return directSnap;
}

async function createUniqueInvitationSlug(name) {
  const baseSlug = slugifyName(name) || 'guest';
  let slug = `${baseSlug}-${createShortId()}`;

  while ((await db.collection('invitations').doc(slug).get()).exists) {
    slug = `${baseSlug}-${createShortId()}`;
  }

  return slug;
}

function createShortId() {
  return uuidv4().split('-').at(0);
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

function getFrontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

function getDefaultEventSettings() {
  return { ...DEFAULT_EVENT_SETTINGS };
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

function safeFirestoreId(value) {
  return String(value || '').trim().toLowerCase().replace(/\//g, '_');
}

function serializeRoleRequest(request) {
  return {
    ...request,
    createdAt: serializeTimestamp(request.createdAt),
    updatedAt: serializeTimestamp(request.updatedAt),
    reviewedAt: serializeTimestamp(request.reviewedAt)
  };
}

function serializeEvent(event) {
  return {
    ...event,
    date: serializeTimestamp(event.date),
    updatedAt: serializeTimestamp(event.updatedAt)
  };
}

function serializeInvitation(invitation) {
  if (!invitation) return null;

  return {
    ...invitation,
    rsvp: serializeRsvp(invitation.rsvp),
    sentAt: serializeTimestamp(invitation.sentAt),
    checkedInAt: serializeTimestamp(invitation.checkedInAt),
    rsvpConfirmedAt: serializeTimestamp(invitation.rsvpConfirmedAt)
  };
}

function serializeRsvp(rsvp) {
  if (!rsvp) return null;

  return {
    ...rsvp,
    confirmedAt: serializeTimestamp(rsvp.confirmedAt)
  };
}

function normalizeRsvp({ attendance, partySize, guest, confirmedAt }) {
  const normalizedAttendance = attendance === 'declined' ? 'declined' : 'attending';
  const normalizedPartySize = normalizedAttendance === 'declined'
    ? 0
    : Math.min(20, Math.max(1, Number.parseInt(partySize, 10) || 1));

  return {
    attendance: normalizedAttendance,
    partySize: normalizedPartySize,
    guestName: guest?.name || '',
    confirmedAt
  };
}

function serializeTimestamp(value) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value?.toDate) return value.toDate().toISOString();
  return value ?? null;
}
