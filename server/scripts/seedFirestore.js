import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';

if (process.env.DEMO_MODE === 'true') {
  console.log('DEMO_MODE is enabled. Seed is skipped because demo data is generated in memory at server startup.');
  process.exit(0);
}

const [{ FieldValue, Timestamp }, { db }] = await Promise.all([
  import('firebase-admin/firestore'),
  import('../src/services/firebase.js')
]);

const sampleGuests = [
  {
    name: 'Alya Prameswari',
    email: 'alya@example.com',
    phone: '+628111111111',
    category: 'VIP',
    tableNumber: 'A1'
  },
  {
    name: 'Bima Santoso',
    email: 'bima@example.com',
    phone: '+628122222222',
    category: 'Regular',
    tableNumber: 'B4'
  },
  {
    name: 'Citra Lestari',
    email: 'citra@example.com',
    phone: '+628133333333',
    category: 'VIP',
    tableNumber: 'A2'
  }
];

async function seed() {
  const batch = db.batch();

  const eventRef = db.collection('event_settings').doc('main');
  batch.set(eventRef, {
    title: 'The Wedding Celebration',
    date: Timestamp.fromDate(new Date('2026-08-08T10:00:00+07:00')),
    location: 'The Glass House, Jakarta',
    coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552',
    description: 'A warm, elegant gathering to celebrate love, family, and friendship.'
  });

  for (const guest of sampleGuests) {
    const invitationId = uuidv4();
    const guestRef = db.collection('guests').doc();
    const invitationRef = db.collection('invitations').doc(invitationId);

    batch.set(guestRef, {
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      category: guest.category,
      createdAt: FieldValue.serverTimestamp()
    });

    batch.set(invitationRef, {
      guestId: guestRef.id,
      status: 'pending',
      qrCodeData: invitationId,
      tableNumber: guest.tableNumber
    });
  }

  await batch.commit();
  console.log('Firestore seed completed.');
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
