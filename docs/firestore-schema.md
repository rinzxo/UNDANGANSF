# Firestore Schema

## `guests`

Guest profile data created during public registration.

```js
{
  name: string,
  email: string,
  phone: string,
  category: 'VIP' | 'Regular',
  createdAt: Timestamp
}
```

## `invitations`

Invitation document keyed by the generated UUID invitation ID.

```js
{
  guestId: string,
  status: 'pending' | 'sent' | 'failed' | 'checked-in',
  qrCodeData: string,
  tableNumber: string | null,
  sentAt?: Timestamp,
  checkedInAt?: Timestamp,
  latestPhotoUrl?: string,
  emailError?: string
}
```

## `attendance_logs`

Immutable check-in history. Multiple logs can exist for the same invitation if a guest is scanned more than once.

```js
{
  invitationId: string,
  checkInTime: Timestamp,
  photoUrl: string,
  type: 'manual' | 'auto'
}
```

## `event_settings`

Use document ID `main` for the active event settings consumed by the public invitation page.

```js
{
  title: string,
  partnerOneName: string,
  partnerTwoName: string,
  partnerOneParentLine: string, // e.g. "Putra ketiga dari Bpk. Zahari & Ibu Mintarsih"
  partnerTwoParentLine: string, // e.g. "Putri ... dari Bpk. ... & Ibu ..."
  date: Timestamp,
  location: string,
  coverImage: string,
  heroImagePosition: 'top' | 'center' | 'bottom',
  heroPhotoStripImages: string[],
  description: string,
  scheduleTitle: string,
  ceremonyTitle: string,
  ceremonyDate: string,
  ceremonyTime: string,
  ceremonyVenue: string,
  ceremonyAddress: string,
  receptionTitle: string,
  receptionDate: string,
  receptionTime: string,
  receptionVenue: string,
  receptionAddress: string,
  loveStoryTitle: string,
  loveStoryScenes: Array<{
    label: string,
    title: string,
    body: string,
    image: string
  }>, // public invitation uses up to 3 cinematic chapters
  giftTitle: string,
  giftDescription: string,
  giftQrisImage: string,
  giftQrisLabel: string,
  giftBankAccounts: Array<{
    bankName: string,
    accountNumber: string,
    accountName: string
  }>
}
```
